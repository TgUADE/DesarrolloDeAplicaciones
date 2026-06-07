import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin.api';

export default function AdminSubmissions() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['admin-submissions'],
    queryFn: () => adminApi.listSubmissions(),
  });

  const acceptMutation = useMutation({
    mutationFn: ({ id, precioBaseOfrecido, comisionesInfo }: any) =>
      adminApi.acceptSubmission(id, { precioBaseOfrecido, comisionesInfo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-submissions'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, motivoRechazo }: any) => adminApi.rejectSubmission(id, motivoRechazo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-submissions'] }),
  });

  const subs = data?.data?.data?.submissions ?? [];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
      <h1>Solicitudes de Artículos</h1>
      {subs.map((sub: any) => (
        <div key={sub.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <p><strong>{sub.descripcion?.slice(0, 100)}</strong></p>
          <p>Estado: <strong>{sub.status.replace(/_/g, ' ')}</strong></p>
          <p>Usuario: {sub.user?.nombre} {sub.user?.apellido}</p>
          <p>Fecha: {new Date(sub.createdAt).toLocaleDateString('es-AR')}</p>
          {sub.status === 'pendiente_empresa' && (
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={() => {
                const precio = prompt('Precio base ofrecido:');
                const comisiones = prompt('Info de comisiones:');
                if (precio && comisiones) acceptMutation.mutate({ id: sub.id, precioBaseOfrecido: Number(precio), comisionesInfo: comisiones });
              }} style={{ padding: '6px 16px', background: 'green', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                Aceptar y proponer precio
              </button>
              <button onClick={() => {
                const motivo = prompt('Motivo del rechazo:');
                if (motivo) rejectMutation.mutate({ id: sub.id, motivoRechazo: motivo });
              }} style={{ padding: '6px 16px', background: 'red', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                Rechazar
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
