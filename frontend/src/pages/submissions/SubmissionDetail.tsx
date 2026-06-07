import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { submissionApi } from '../../api/submission.api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/formatCurrency';

export default function SubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['submission', id],
    queryFn: () => submissionApi.getById(id!),
  });

  const acceptMutation = useMutation({
    mutationFn: () => submissionApi.userAccept(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['submission', id] }),
    onError: (err: any) => alert(err.response?.data?.error),
  });

  const rejectMutation = useMutation({
    mutationFn: () => submissionApi.userReject(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['submission', id] }),
    onError: (err: any) => alert(err.response?.data?.error),
  });

  const sub = data?.data?.data;
  if (isLoading) return <p>Cargando...</p>;
  if (!sub) return <p>Solicitud no encontrada.</p>;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
      <Link to="/submissions">← Mis solicitudes</Link>
      <h1>Solicitud de subasta</h1>
      <p><strong>Estado:</strong> {sub.status.replace(/_/g, ' ')}</p>
      <p><strong>Descripción:</strong> {sub.descripcion}</p>
      {sub.datosHistoricos && <p><strong>Historia:</strong> {sub.datosHistoricos}</p>}
      <p><strong>Cuenta de cobro:</strong> {sub.cuentaCobro}</p>
      <p><strong>Declaración de propiedad:</strong> {sub.declaracionPropiedad ? '✓ Sí' : '✗ No'}</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {sub.images?.map((img: any) => (
          <img key={img.id} src={img.url} alt="" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 4 }} />
        ))}
      </div>

      {sub.status === 'precio_propuesto' && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', padding: 20, borderRadius: 8, marginBottom: 20 }}>
          <h3>La empresa propuso:</h3>
          <p><strong>Precio base:</strong> {formatCurrency(Number(sub.precioBaseOfrecido), 'ARS')}</p>
          <p><strong>Comisiones:</strong> {sub.comisionesInfo}</p>
          <p>¿Aceptás los términos?</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending}
              style={{ padding: '8px 20px', background: 'green', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              Aceptar
            </button>
            <button onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending}
              style={{ padding: '8px 20px', background: 'red', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              Rechazar
            </button>
          </div>
        </div>
      )}

      {sub.motivoRechazo && (
        <div style={{ background: '#f8d7da', padding: 16, borderRadius: 8 }}>
          <strong>Motivo de rechazo:</strong> {sub.motivoRechazo}
        </div>
      )}
    </div>
  );
}
