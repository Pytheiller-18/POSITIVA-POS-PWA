import React, { useState } from 'react';
import { Eye, EyeOff, Lock, X } from 'lucide-react';
import { usePos } from '../../context/PosContext.tsx';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, pushToast } = usePos();
  const [email, setEmail] = useState('admin@pos.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      pushToast('Sesión Multi-Tenant iniciada y sincronizada', 'success');
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No fue posible autenticar con el servidor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay active" role="dialog" aria-modal="true">
      <div className="modal-content" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={20} /> Acceso Servidor Positiva-POS
          </h2>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Correo Electrónico
            </label>
            <input
              id="login-email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Contraseña
            </label>
            <div className="password-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
            Demo: <code>admin@pos.com</code> / <code>admin123</code> o <code>cajero@pos.com</code> /{' '}
            <code>cajero123</code>
          </p>

          {errorMsg && (
            <div
              className="checkout-change-card change-negative"
              style={{ padding: '0.65rem 0.85rem', marginBottom: '0.85rem', fontSize: '0.82rem' }}
            >
              {errorMsg}
            </div>
          )}

          <button type="submit" className="btn btn-action btn-block" disabled={submitting}>
            {submitting ? 'Verificando JWT...' : 'Iniciar Sesión y Sincronizar'}
          </button>
        </form>
      </div>
    </div>
  );
};

