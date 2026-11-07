import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Flashlight, FlipHorizontal2, RefreshCw, X } from 'lucide-react';
import { playScannerBeep } from '../../utils/audio.ts';

interface Html5QrcodeCamera {
  id: string;
  label: string;
}

interface Html5QrcodeInstance {
  start: (
    cameraIdOrConfig: string | { facingMode: string },
    config: Record<string, unknown>,
    onScanSuccess: (decodedText: string) => void,
    onScanError: () => void
  ) => Promise<void>;
  stop: () => Promise<void>;
  applyVideoConstraints?: (constraints: Record<string, unknown>) => Promise<void>;
}

interface Html5QrcodeConstructor {
  new (elementId: string): Html5QrcodeInstance;
  getCameras: () => Promise<Html5QrcodeCamera[]>;
}

interface BarcodeScannerModalProps {
  isOpen: boolean;
  title?: string;
  onDetected: (code: string) => void;
  onClose: () => void;
}

const MIRROR_STORAGE_KEY = 'pos_scanner_mirror';

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  title = 'Escanear Código de Barras / SKU',
  onDetected,
  onClose,
}) => {
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const lastScanRef = useRef<{ code: string; ts: number }>({ code: '', ts: 0 });

  const [cameras, setCameras] = useState<Html5QrcodeCamera[]>([]);
  const [cameraIdx, setCameraIdx] = useState<number>(0);
  const [isMirrored, setIsMirrored] = useState<boolean>(
    () => localStorage.getItem(MIRROR_STORAGE_KEY) === 'true'
  );
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [statusHint, setStatusHint] = useState<string>(
    'Apunta la cámara trasera o webcam al código de barras del producto'
  );

  const stopScanner = useCallback(async () => {
    if (scannerRef.current && isRunningRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignorar cierre sobre stream ya liberado
      }
      isRunningRef.current = false;
      setIsTorchOn(false);
    }
  }, []);

  const handleDecoded = useCallback(
    (rawCode: string) => {
      const clean = String(rawCode || '').trim();
      if (!clean) return;
      const now = Date.now();
      if (lastScanRef.current.code === clean && now - lastScanRef.current.ts < 1400) {
        return;
      }
      lastScanRef.current = { code: clean, ts: now };
      playScannerBeep();
      setStatusHint(`Código detectado: ${clean}`);
      onDetected(clean);
    },
    [onDetected]
  );

  useEffect(() => {
    if (!isOpen) {
      void stopScanner();
      return;
    }

    let cancelled = false;

    async function initCamera() {
      const Html5QrcodeLib = (window as unknown as { Html5Qrcode?: Html5QrcodeConstructor })
        .Html5Qrcode;
      if (!Html5QrcodeLib) {
        setStatusHint('Motor óptico no disponible; ingresa el código manualmente abajo.');
        return;
      }

      try {
        const list = await Html5QrcodeLib.getCameras().catch(() => []);
        if (cancelled) return;
        setCameras(list);

        if (!scannerRef.current) {
          scannerRef.current = new Html5QrcodeLib('scanner-viewport');
        }
        await stopScanner();

        let cameraConfig: string | { facingMode: string } = { facingMode: 'environment' };
        if (list.length > 0) {
          if (cameraIdx === 0) {
            const backCam = list.find((c) =>
              /back|trasera|posterior|environment/i.test(c.label || '')
            );
            cameraConfig = backCam ? backCam.id : list[0].id;
          } else {
            cameraConfig = list[cameraIdx % list.length].id;
          }
        }

        await scannerRef.current.start(
          cameraConfig,
          {
            fps: 15,
            qrbox: { width: 260, height: 160 },
            aspectRatio: 1.0,
            experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          },
          (decoded) => handleDecoded(decoded),
          () => {}
        );
        isRunningRef.current = true;
        setStatusHint('Apunta la cámara trasera o webcam al código de barras del producto');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Permiso de cámara denegado';
        setStatusHint(`Sin acceso a cámara (${msg}). Usa ingreso manual.`);
      }
    }

    void initCamera();

    return () => {
      cancelled = true;
      void stopScanner();
    };
  }, [isOpen, cameraIdx, stopScanner, handleDecoded]);

  if (!isOpen) return null;

  const toggleMirror = () => {
    setIsMirrored((prev) => {
      const next = !prev;
      localStorage.setItem(MIRROR_STORAGE_KEY, next ? 'true' : 'false');
      return next;
    });
  };

  const toggleTorch = async () => {
    if (!scannerRef.current?.applyVideoConstraints || !isRunningRef.current) return;
    try {
      const next = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: next }],
      });
      setIsTorchOn(next);
    } catch {
      setStatusHint('Linterna no compatible en este sensor óptico');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDecoded(manualCode.trim());
    setManualCode('');
  };

  return (
    <div className="modal-overlay active" role="dialog" aria-modal="true">
      <div className="scanner-modal-content">
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Camera size={20} /> {title}
          </h2>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="scanner-viewport-wrapper">
          {/* R-03 AGENTS.md: .scanner-mirrored aplica scaleX(-1) solo al <video> visual */}
          <div id="scanner-viewport" className={isMirrored ? 'scanner-mirrored' : ''} />
          <div className="scanner-laser-overlay">
            <div className="scanner-laser-line" />
          </div>
        </div>

        <div className="scanner-controls-bar">
          <button type="button" className="btn btn-secondary btn-sm" onClick={toggleTorch}>
            <Flashlight size={15} />
            <span>{isTorchOn ? 'Apagar Luz' : 'Linterna'}</span>
          </button>

          <button
            type="button"
            id="btn-scanner-toggle-mirror"
            className={`btn btn-secondary btn-sm ${isMirrored ? 'active' : ''}`}
            onClick={toggleMirror}
            title="Invertir vista horizontalmente (modo espejo)"
          >
            <FlipHorizontal2 size={15} />
            <span>{isMirrored ? 'Espejo: Activo' : 'Invertir Vista'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setCameraIdx((prev) => prev + 1)}
            disabled={cameras.length < 2}
          >
            <RefreshCw size={15} />
            <span>Cambiar Cámara</span>
          </button>
        </div>

        <div id="scanner-last-detected" className="scanner-status-hint">
          {statusHint}
        </div>

        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Ingresar código SKU manual..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Usar SKU
          </button>
        </form>
      </div>
    </div>
  );
};

