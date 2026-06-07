import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userApi } from '../../api/user.api';

const STATUS_LABELS: Record<string, string> = {
  pendiente_empresa: 'Pendiente de revisión',
  interesada: 'Empresa interesada',
  rechazada_empresa: 'Rechazada por la empresa',
  precio_propuesto: 'Precio propuesto - aguardando tu respuesta',
  aceptada_usuario: 'Aceptada',
  rechazada_usuario: 'Rechazada por vos',
};

export default function MySubmissions() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['submissions', user?.id],
    queryFn: () => userApi.getSubmissions(user!.id),
    enabled: !!user,
  });

  const submissions = data?.data?.data?.submissions ?? [];

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Mis Solicitudes</h1>
        <Link to="/submissions/new"><button style={{ padding: '8px 16px' }}>+ Nueva solicitud</button></Link>
      </div>
      {isLoading && <p>Cargando...</p>}
      {submissions.length === 0 && !isLoading && <p>No tenés solicitudes aún.</p>}
      {submissions.map((sub: any) => (
        <Link to={`/submissions/${sub.id}`} key={sub.id} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 12, cursor: 'pointer' }}>
            <p style={{ margin: 0 }}><strong>{sub.descripcion.slice(0, 80)}...</strong></p>
            <p style={{ margin: '4px 0', fontSize: 13, color: sub.status === 'precio_propuesto' ? 'orange' : '#666' }}>
              {STATUS_LABELS[sub.status] ?? sub.status}
            </p>
            <small style={{ color: '#999' }}>{new Date(sub.createdAt).toLocaleDateString('es-AR')}</small>
          </div>
        </Link>
      ))}
    </div>
  );
}
