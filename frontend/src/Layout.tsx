import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { clearToken, getStoredUser } from './api';

interface Props {
  onLogout: () => void;
  pendingUsers: number;
  pendingSubmissions: number;
  pendingPayments: number;
  pendingProfileRequests: number;
}

const NAV = [
  { path: '/users', icon: '👥', label: 'Usuarios' },
  { path: '/submissions', icon: '📦', label: 'Solicitudes' },
  { path: '/payment-methods', icon: '💳', label: 'Medios de pago' },
  { path: '/profile-requests', icon: '📝', label: 'Datos de perfil' },
  { path: '/duenios', icon: '🏷️', label: 'Dueños' },
  { path: '/auctions', icon: '🔨', label: 'Subastas' },
  { path: '/auctioneers', icon: '🎙️', label: 'Subastadores' },
  { path: '/purchases', icon: '💰', label: 'Compras' },
  { path: '/seguros', icon: '🛡️', label: 'Seguros' },
];

export default function Layout({ onLogout, pendingUsers, pendingSubmissions, pendingPayments, pendingProfileRequests }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser();

  const handleLogout = () => {
    clearToken();
    onLogout();
  };

  const badge = (path: string) => {
    if (path === '/users' && pendingUsers > 0) return pendingUsers;
    if (path === '/submissions' && pendingSubmissions > 0) return pendingSubmissions;
    if (path === '/payment-methods' && pendingPayments > 0) return pendingPayments;
    if (path === '/profile-requests' && pendingProfileRequests > 0) return pendingProfileRequests;
    return null;
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>🔨 Admin Panel</h1>
          <p>Subastas</p>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((n) => {
            const b = badge(n.path);
            return (
              <button
                key={n.path}
                className={`nav-item ${location.pathname === n.path ? 'active' : ''}`}
                onClick={() => navigate(n.path)}>
                <span className="icon">{n.icon}</span>
                {n.label}
                {b ? <span className="badge-dot">{b}</span> : null}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user">
              <strong>{user.nombre} {user.apellido}</strong>
              {user.email}
            </div>
          )}
          <button className="btn-logout" onClick={handleLogout}>
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
