from datetime import datetime, timezone
from decimal import Decimal
from flask import current_app
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from app.extensions import db
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.sync_log import SyncAuditLog
from app.utils.validators import ValidationError, to_decimal, to_int, clean_str, TWO_PLACES
from app.utils.uuid7 import uuid7_str

# ============================================================================
# DOBLE VERIFICACIÓN DE SEGURIDAD - PROCESAMIENTO ACID E IDEMPOTENCIA (DDIA):
# 1. Idempotencia Causal (UUIDv7): Se verifica (tenant_id, client_sync_id) antes
#    de cualquier mutación y bajo restricción UNIQUE para impedir doble cobro o
#    doble deducción de stock ante reintentos de red, dejando rastro en sync_log.
# 2. Aislamiento Anti-IDOR y Race Conditions: Bloqueo en orden determinista de ID
#    (SELECT ... FOR UPDATE en motores transaccionales) + expresión atómica SQL
#    Product.stock - qty filtrada estrictamente por tenant_id.
# 3. Transaccionalidad ACID: Todo se valida antes de mutar inventario; cualquier
#    error revierte la transacción completa sin efectos colaterales.
# 4. Exactitud Contable COP: Uso exclusivo de Decimal(12, 2) con costo histórico
#    inmutable (unit_cost) congelado en sale_items.
# ============================================================================

VALID_PAYMENT_METHODS = {'CASH', 'CARD', 'TRANSFER', 'OTHER'}
MAX_ITEMS_PER_SALE = 500
MAX_QTY_PER_ITEM = 100_000
MAX_INVOICE_RETRIES = 3
ZERO = Decimal('0.00')


class SaleError(Exception):
    """Error de regla de negocio con código HTTP semántico."""

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def generate_invoice_number(tenant_id: str) -> str:
    """
    Genera el siguiente consecutivo POS-AAAA-NNNNNN del tenant.
    La restricción UNIQUE(tenant_id, invoice_number) + reintentos resuelven carreras.
    """
    year = datetime.now(timezone.utc).year
    prefix = f"POS-{year}-"
    last = db.session.query(func.max(Sale.invoice_number)).filter(
        Sale.tenant_id == tenant_id,
        Sale.invoice_number.like(f"{prefix}%")
    ).scalar()
    next_seq = 1
    if last:
        try:
            next_seq = int(last[len(prefix):]) + 1
        except ValueError:
            next_seq = 1
    return f"{prefix}{next_seq:06d}"


def _log_sync_event(tenant_id: str, client_sync_id: str, device_id: str, status: str, details: str) -> None:
    """Registra trazabilidad de sincronización/idempotencia en sync_audit_log."""
    try:
        db.session.add(SyncAuditLog(
            id=uuid7_str(),
            tenant_id=tenant_id,
            client_sync_id=client_sync_id[:64],
            device_id=(device_id or 'WEB-POS')[:100],
            status=status,
            details=details[:500] if details else None,
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()


def _idempotent_response(sale: Sale, device_id: str = 'WEB-POS') -> tuple[dict, int]:
    _log_sync_event(
        tenant_id=sale.tenant_id,
        client_sync_id=sale.client_sync_id,
        device_id=device_id,
        status='ALREADY_SYNCED',
        details=f'Reintento idempotente ignorado para factura {sale.invoice_number}',
    )
    return {
        'success': True,
        'message': 'Venta ya registrada previamente (Idempotente)',
        'already_synced': True,
        'sale': sale.to_dict()
    }, 200


def _parse_sale_input(data: dict) -> dict:
    """Valida y normaliza el DTO de venta como función de frontera hacia el dominio."""
    items_data = data.get('items')
    if not items_data or not isinstance(items_data, list):
        raise SaleError('La venta debe contener al menos un producto válido', 400)
    if len(items_data) > MAX_ITEMS_PER_SALE:
        raise SaleError(f'La venta excede el máximo de {MAX_ITEMS_PER_SALE} ítems', 400)

    quantities: dict[str, int] = {}
    for item in items_data:
        if not isinstance(item, dict) or not item.get('product_id'):
            raise SaleError('Cada ítem debe incluir product_id válido', 400)
        pid = clean_str(str(item['product_id']), 'product_id', 64, required=True)
        qty = to_int(item.get('quantity'), 'quantity', default=None, min_value=1, max_value=MAX_QTY_PER_ITEM)
        quantities[pid] = quantities.get(pid, 0) + qty

    payment_method = str(data.get('payment_method') or 'CASH').strip().upper()
    if payment_method not in VALID_PAYMENT_METHODS:
        raise SaleError(f'Método de pago inválido: {payment_method}', 400)

    return {
        'quantities': quantities,
        'payment_method': payment_method,
        'amount_paid': to_decimal(data.get('amount_paid'), 'amount_paid', default=0, min_value=0, max_value=10**10),
        'discount': to_decimal(data.get('discount'), 'discount', default=0, min_value=0, max_value=10**10),
        'tax_rate': to_decimal(data.get('tax_rate'), 'tax_rate', default=0, min_value=0, max_value=1),
        'notes': clean_str(data.get('notes'), 'notes', 255),
        'device_id': clean_str(str(data.get('device_id') or 'WEB-POS'), 'device_id', 100) or 'WEB-POS',
    }


def _persist_sale(tenant_id: str, user_id: str, client_sync_id: str, parsed: dict, sync_status: str) -> Sale:
    """Construye y confirma la venta en una única transacción ACID."""
    quantities = parsed['quantities']
    ordered_pids = sorted(quantities.keys())

    # 1. Consulta filtrada por tenant_id con bloqueo de fila en motores multi-conexión (MySQL/PostgreSQL)
    query = Product.query.filter(
        Product.tenant_id == tenant_id,
        Product.id.in_(ordered_pids)
    ).order_by(Product.id.asc())

    if db.engine.dialect.name in ('mysql', 'mariadb', 'postgresql'):
        query = query.with_for_update()

    products = query.all()
    product_map = {p.id: p for p in products}

    # 2. Validación completa ANTES de mutar inventario (Atomicidad ACID)
    missing = [pid for pid in ordered_pids if pid not in product_map]
    if missing:
        raise SaleError(f'Producto ID {missing[0]} no encontrado en su inventario o no autorizado', 404)

    if sync_status == 'ONLINE':
        inactive = [product_map[pid].name for pid in ordered_pids if not product_map[pid].is_active]
        if inactive:
            raise SaleError(f'El producto "{inactive[0]}" se encuentra desactivado', 409)

    # 3. Construcción de ítems con precios autoritativos del servidor y costo histórico congelado
    subtotal = ZERO
    sale_items = []
    for pid in ordered_pids:
        qty = quantities[pid]
        product = product_map[pid]
        unit_price = Decimal(str(product.sale_price or 0)).quantize(TWO_PLACES)
        unit_cost = Decimal(str(product.cost_price or 0)).quantize(TWO_PLACES)
        line_total = (unit_price * qty).quantize(TWO_PLACES)
        subtotal += line_total
        sale_items.append(SaleItem(
            id=uuid7_str(),
            tenant_id=tenant_id,
            product_id=product.id,
            product_name=product.name,
            quantity=qty,
            unit_cost=unit_cost,
            unit_price=unit_price,
            subtotal=line_total,
            total=line_total
        ))

    # 4. Cálculo monetario exacto en Decimal
    discount = min(parsed['discount'], subtotal)
    tax = ((subtotal - discount) * parsed['tax_rate']).quantize(TWO_PLACES)
    total = max(ZERO, subtotal - discount + tax)
    amount_paid = parsed['amount_paid'] if parsed['amount_paid'] > ZERO else total
    change_due = max(ZERO, amount_paid - total)

    # 5. Deducción ATÓMICA en SQL (UPDATE products SET stock = stock - :qty)
    for pid in ordered_pids:
        product_map[pid].stock = Product.stock - quantities[pid]

    sale = Sale(
        id=uuid7_str(),
        tenant_id=tenant_id,
        user_id=user_id,
        client_sync_id=client_sync_id,
        invoice_number=generate_invoice_number(tenant_id),
        subtotal=subtotal,
        tax=tax,
        discount=discount,
        total=total,
        payment_method=parsed['payment_method'],
        amount_paid=amount_paid,
        change_due=change_due,
        sync_status=sync_status,
        notes=parsed['notes']
    )
    db.session.add(sale)
    for s_item in sale_items:
        s_item.sale_id = sale.id
        db.session.add(s_item)

    db.session.add(SyncAuditLog(
        id=uuid7_str(),
        tenant_id=tenant_id,
        client_sync_id=client_sync_id,
        device_id=parsed['device_id'],
        status='SUCCESS',
        details=f'Venta registrada {sale.invoice_number} por valor de {total}'
    ))

    db.session.commit()
    return sale


def process_sale(tenant_id: str, user_id: str, data: dict, sync_status: str = 'ONLINE') -> tuple[dict, int]:
    """
    Procesa y registra una venta garantizando atomicidad ACID e idempotencia causal.
    Retorna (resultado_dict, status_code). Nunca propaga excepciones no controladas.
    """
    if not isinstance(data, dict):
        return {'success': False, 'error': 'Formato de venta inválido'}, 400

    raw_sync_id = data.get('client_sync_id')
    try:
        client_sync_id = clean_str(str(raw_sync_id), 'client_sync_id', 64, required=True) if raw_sync_id else uuid7_str()
    except ValidationError as e:
        return {'success': False, 'error': str(e)}, 400

    raw_device = str(data.get('device_id') or 'WEB-POS')[:100]

    # 1. VERIFICACIÓN DE IDEMPOTENCIA PREVIA
    existing_sale = Sale.query.filter_by(tenant_id=tenant_id, client_sync_id=client_sync_id).first()
    if existing_sale:
        return _idempotent_response(existing_sale, device_id=raw_device)

    try:
        parsed = _parse_sale_input(data)
    except (ValidationError, SaleError) as e:
        if sync_status == 'SYNCED_OFFLINE':
            _log_sync_event(tenant_id, client_sync_id, raw_device, 'ERROR', str(e))
        return {'success': False, 'error': str(e)}, getattr(e, 'status', 400)

    for _attempt in range(MAX_INVOICE_RETRIES):
        try:
            sale = _persist_sale(tenant_id, user_id, client_sync_id, parsed, sync_status)
            return {
                'success': True,
                'message': 'Venta registrada exitosamente',
                'already_synced': False,
                'sale': sale.to_dict()
            }, 201
        except SaleError as e:
            db.session.rollback()
            if sync_status == 'SYNCED_OFFLINE':
                _log_sync_event(tenant_id, client_sync_id, parsed['device_id'], 'ERROR', str(e))
            return {'success': False, 'error': str(e)}, e.status
        except IntegrityError:
            db.session.rollback()
            winner = Sale.query.filter_by(tenant_id=tenant_id, client_sync_id=client_sync_id).first()
            if winner:
                return _idempotent_response(winner, device_id=parsed['device_id'])
            continue
        except Exception:
            db.session.rollback()
            current_app.logger.exception('Error interno al procesar venta')
            return {'success': False, 'error': 'Error interno al procesar la venta'}, 500

    return {'success': False, 'error': 'No fue posible asignar número de factura, reintente'}, 409
