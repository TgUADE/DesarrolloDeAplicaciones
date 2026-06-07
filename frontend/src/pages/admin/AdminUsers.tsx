import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/admin.api';

const CATEGORIES = ['comun', 'especial', 'plata', 'oro', 'platino'];
const STATUSES = ['pendiente', 'aprobado', 'suspendido', 'bloqueado'];

export default function AdminUsers() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState({ status: '', categoria: '' });

  const { data } = useQuery({
    queryKey: ['admin-users', filter],
    queryFn: () => adminApi.listUsers({ status: filter.status || undefined, categoria: filter.categoria || undefined }),
  });

  const categoryMutation = useMutation({
    mutationFn: ({ id, categoria }: { id: string; categoria: string }) => adminApi.setUserCategory(id, categoria),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, email }: { id: string; status: string; email?: string }) =>
      adminApi.setUserStatus(id, status, email),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const users = data?.data?.data?.users ?? [];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
      <h1>Gestión de Usuarios</h1>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
          <option value="">Todos los estados</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filter.categoria} onChange={e => setFilter(f => ({ ...f, categoria: e.target.value }))}>
          <option value="">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8f9fa' }}>
            {['Nombre', 'Email', 'Categoría', 'Estado', 'Acciones'].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u: any) => (
            <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px 12px' }}>{u.nombre} {u.apellido}</td>
              <td style={{ padding: '8px 12px' }}>{u.email || <em style={{ color: '#999' }}>Sin email</em>}</td>
              <td style={{ padding: '8px 12px' }}>
                <select value={u.categoria}
                  onChange={e => categoryMutation.mutate({ id: u.id, categoria: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </td>
              <td style={{ padding: '8px 12px' }}>
                <select value={u.status}
                  onChange={e => {
                    const email = e.target.value === 'aprobado' && !u.email
                      ? prompt('Email del usuario para enviar token de registro:') ?? undefined
                      : undefined;
                    statusMutation.mutate({ id: u.id, status: e.target.value, email });
                  }}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td style={{ padding: '8px 12px' }}>
                <small>ID: {u.id.slice(0, 8)}...</small>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
