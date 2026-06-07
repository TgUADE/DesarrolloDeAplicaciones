import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userApi } from '../../api/user.api';

export default function Profile() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: () => userApi.getById(user!.id),
    enabled: !!user,
  });

  const { data: metricsData } = useQuery({
    queryKey: ['metrics', user?.id],
    queryFn: () => userApi.getMetrics(user!.id),
    enabled: !!user,
  });

  const profile = data?.data?.data;
  const metrics = metricsData?.data?.data;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
      <h1>Mi Perfil</h1>
      {profile && (
        <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, marginBottom: 24 }}>
          <p><strong>Nombre:</strong> {profile.nombre} {profile.apellido}</p>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Categoría:</strong> {profile.categoria}</p>
          <p><strong>Estado:</strong> {profile.status}</p>
          <p><strong>Domicilio:</strong> {profile.domicilioLegal}</p>
          <p><strong>País:</strong> {profile.paisOrigen}</p>
        </div>
      )}

      {metrics && (
        <div style={{ marginBottom: 24 }}>
          <h2>Métricas</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              ['Subastas participadas', metrics.totalParticipaciones],
              ['Victorias', metrics.totalVictorias],
              ['Total ofertado ARS', `$${metrics.totalOfertadoARS?.toFixed(0)}`],
              ['Total pagado ARS', `$${metrics.totalPagadoARS?.toFixed(0)}`],
              ['Total ofertado USD', `u$s${metrics.totalOfertadoUSD?.toFixed(0)}`],
              ['Total pagado USD', `u$s${metrics.totalPagadoUSD?.toFixed(0)}`],
            ].map(([label, value]) => (
              <div key={label as string} style={{ background: '#fff', border: '1px solid #ddd', padding: 16, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold' }}>{value}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link to="/profile/payment-methods"><button style={{ padding: '8px 16px' }}>Medios de pago</button></Link>
        <Link to="/profile/messages"><button style={{ padding: '8px 16px' }}>Mensajes</button></Link>
        <Link to="/profile/purchases"><button style={{ padding: '8px 16px' }}>Mis compras</button></Link>
        <Link to="/profile/submissions"><button style={{ padding: '8px 16px' }}>Mis solicitudes</button></Link>
      </div>
    </div>
  );
}
