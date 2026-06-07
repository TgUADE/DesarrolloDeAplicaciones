import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/icons/logo.svg';

/* Pantalla de carga inicial. Muestra la marca mientras se resuelve la sesión
   y redirige: con sesión → /auctions, sin sesión → /auth/login. */
export default function Splash() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      navigate(user ? '/auctions' : '/auth/login', { replace: true });
    }, 1600);
    return () => clearTimeout(t);
  }, [loading, user, navigate]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--gradient-brand)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-lg)',
      }}
    >
      <img
        src={logo}
        alt="SubastApp"
        style={{ width: 140, height: 140, borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-elevated)' }}
      />
      <div style={{ textAlign: 'center', color: 'var(--color-text-on-primary)' }}>
        <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>SubastApp</div>
        <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.75, marginTop: 4 }}>Subastas en vivo</div>
      </div>
    </div>
  );
}
