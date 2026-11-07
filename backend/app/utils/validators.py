"""
Utilidades de validación y sanitización estricta de entrada (Clean Architecture & Hardening).
Todas las conversiones lanzan ValidationError, que el manejador global traduce a HTTP 400
impidiendo fugas de trazas internas, inyecciones XSS o corrupción numérica.
"""
import re
import threading
import time
from collections import defaultdict, deque
from datetime import datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

TWO_PLACES = Decimal('0.01')

# Patrones peligrosos de inyección XSS / ejecución de scripts en campos de texto
_XSS_PATTERN = re.compile(
    r'(<\s*/?\s*(script|iframe|object|embed|svg|link|meta)\b|javascript\s*:|on\w+\s*=)',
    re.IGNORECASE,
)


class ValidationError(ValueError):
    """Error de validación semántica de datos de entrada del cliente."""


def require_json_object(payload) -> dict:
    """Garantiza que el cuerpo recibido sea un objeto JSON (dict) válido."""
    if payload is None or not isinstance(payload, dict):
        raise ValidationError('El cuerpo de la solicitud debe ser un objeto JSON válido')
    return payload


def to_decimal(value, field: str, default=None, min_value=None, max_value=None) -> Decimal:
    """Convierte a Decimal exacto de 2 decimales (ROUND_HALF_UP) validando rango y tipo."""
    if isinstance(value, bool):
        raise ValidationError(f'El campo "{field}" debe ser numérico')
    if value is None or value == '':
        if default is None:
            raise ValidationError(f'El campo "{field}" es obligatorio')
        value = default
    try:
        raw_dec = Decimal(str(value))
        if not raw_dec.is_finite():
            raise ValidationError(f'El campo "{field}" debe ser un número finito')
        result = raw_dec.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError, TypeError):
        raise ValidationError(f'El campo "{field}" debe ser numérico')
    if min_value is not None and result < Decimal(str(min_value)):
        raise ValidationError(f'El campo "{field}" no puede ser menor que {min_value}')
    if max_value is not None and result > Decimal(str(max_value)):
        raise ValidationError(f'El campo "{field}" no puede ser mayor que {max_value}')
    return result


def to_int(value, field: str, default=None, min_value=None, max_value=None) -> int:
    """Convierte a entero estricto rechazando booleanos, decimales fraccionarios y fuera de rango."""
    if isinstance(value, bool):
        raise ValidationError(f'El campo "{field}" debe ser un número entero')
    if value is None or value == '':
        if default is None:
            raise ValidationError(f'El campo "{field}" es obligatorio')
        value = default
    try:
        if isinstance(value, float) and not value.is_integer():
            raise ValueError
        if isinstance(value, str) and '.' in value.strip():
            raise ValueError
        result = int(value)
    except (ValueError, TypeError):
        raise ValidationError(f'El campo "{field}" debe ser un número entero')
    if min_value is not None and result < min_value:
        raise ValidationError(f'El campo "{field}" no puede ser menor que {min_value}')
    if max_value is not None and result > max_value:
        raise ValidationError(f'El campo "{field}" no puede ser mayor que {max_value}')
    return result


def clean_str(value, field: str, max_len: int, required: bool = False):
    """Normaliza cadenas: recorta espacios, bloquea bytes de control/XSS y valida longitud."""
    if value is None:
        if required:
            raise ValidationError(f'El campo "{field}" es obligatorio')
        return None
    if not isinstance(value, str):
        raise ValidationError(f'El campo "{field}" debe ser texto')
    if '\x00' in value or any(ord(ch) < 32 and ch not in ('\t', '\n', '\r') for ch in value):
        raise ValidationError(f'El campo "{field}" contiene caracteres de control no permitidos')
    value = value.strip()
    if required and not value:
        raise ValidationError(f'El campo "{field}" es obligatorio')
    if len(value) > max_len:
        raise ValidationError(f'El campo "{field}" excede {max_len} caracteres')
    if value and _XSS_PATTERN.search(value):
        raise ValidationError(f'El campo "{field}" contiene etiquetas o scripts no permitidos')
    return value or None


def parse_iso_datetime(raw: str, field: str) -> datetime:
    """Convierte una cadena ISO 8601 a datetime validando formato."""
    if not isinstance(raw, str) or not raw.strip():
        raise ValidationError(f'El parámetro de fecha "{field}" es inválido')
    try:
        return datetime.fromisoformat(raw.strip().replace('Z', '+00:00'))
    except ValueError:
        raise ValidationError(f'El parámetro "{field}" debe tener formato ISO 8601 válido')


class LoginRateLimiter:
    """
    Limitador en memoria de intentos fallidos de login por (IP, email).
    Ventana deslizante: tras N fallos en W segundos se bloquea temporalmente.
    """

    def __init__(self):
        self._attempts = defaultdict(deque)
        self._lock = threading.Lock()

    def _prune(self, key, window):
        now = time.monotonic()
        q = self._attempts[key]
        while q and now - q[0] > window:
            q.popleft()
        return q

    def is_blocked(self, key, max_attempts, window) -> int:
        """Retorna segundos restantes de bloqueo (0 si no está bloqueado)."""
        with self._lock:
            q = self._prune(key, window)
            if len(q) >= max_attempts:
                return max(1, int(window - (time.monotonic() - q[0])))
            return 0

    def register_failure(self, key, window):
        with self._lock:
            self._prune(key, window).append(time.monotonic())

    def reset(self, key):
        with self._lock:
            self._attempts.pop(key, None)


login_limiter = LoginRateLimiter()
