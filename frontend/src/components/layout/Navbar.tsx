import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Rutas full-screen donde la barra no debe mostrarse (splash y auth).
const HIDDEN_PREFIXES = ['/auth'];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const hidden = pathname === '/' || HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
  if (hidden) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  return (
    <nav style={{ background: '#1a1a2e', color: 'white', padding: '0 24px', display: 'flex', alignItems: 'center', height: 56, gap: 24 }}>
      <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold', fontSize: 18 }}>
        🔨 Subastas
      </Link>
      <Link to="/auctions" style={{ color: '#aaa', textDecoration: 'none' }}>Subastas</Link>
      {user && (
        <>
          <Link to="/profile" style={{ color: '#aaa', textDecoration: 'none' }}>Mi perfil</Link>
          <Link to="/submissions" style={{ color: '#aaa', textDecoration: 'none' }}>Mis solicitudes</Link>
          {user.isAdmin && <Link to="/admin" style={{ color: '#ffd700', textDecoration: 'none' }}>Admin</Link>}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13 }}>{user.nombre} ({user.categoria})</span>
            <button onClick={handleLogout} style={{ padding: '4px 12px', background: 'transparent', border: '1px solid #666', color: '#aaa', cursor: 'pointer', borderRadius: 4 }}>
              Salir
            </button>
          </div>
        </>
      )}
      {!user && (
        <div style={{ marginLeft: 'auto' }}>
          <Link to="/auth/login" style={{ color: 'white', textDecoration: 'none', padding: '6px 16px', background: '#007bff', borderRadius: 4 }}>
            Iniciar sesión
          </Link>
        </div>
      )}
    </nav>
  );
}
