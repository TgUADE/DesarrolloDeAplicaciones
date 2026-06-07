import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h1>Panel de Administración</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24 }}>
        {[
          { to: '/admin/users', label: 'Usuarios', icon: '👥', desc: 'Aprobar, asignar categorías, verificar medios de pago' },
          { to: '/admin/auctions', label: 'Subastas', icon: '🔨', desc: 'Crear y gestionar subastas' },
          { to: '/admin/submissions', label: 'Solicitudes', icon: '📦', desc: 'Revisar artículos enviados por usuarios' },
          { to: '/admin/items', label: 'Ítems', icon: '🎨', desc: 'Registrar seguros y ubicaciones' },
          { to: '/admin/purchases', label: 'Compras', icon: '💰', desc: 'Gestionar pagos y multas' },
        ].map(({ to, label, icon, desc }) => (
          <Link to={to} key={to} style={{ textDecoration: 'none' }}>
            <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 20, textAlign: 'center', cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
              <div style={{ fontSize: 40 }}>{icon}</div>
              <h3>{label}</h3>
              <p style={{ fontSize: 12, color: '#666' }}>{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
