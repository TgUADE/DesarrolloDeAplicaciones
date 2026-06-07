import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin.api';
import { auctionApi } from '../../api/auction.api';

const CATEGORIES = ['comun', 'especial', 'plata', 'oro', 'platino'];
const STATUSES_TRANSITION: Record<string, string[]> = {
  programada: ['abierta'],
  abierta: ['cerrada'],
  cerrada: ['finalizada'],
  finalizada: [],
};

export default function AdminAuctions() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    titulo: '', descripcion: '', fechaHora: '', ubicacion: '',
    categoria: 'comun', moneda: 'ARS', rematadorId: '',
  });

  const { data: auctionsData } = useQuery({
    queryKey: ['auctions-all'],
    queryFn: () => auctionApi.list(),
  });

  const { data: auctioneersData } = useQuery({
    queryKey: ['auctioneers'],
    queryFn: () => adminApi.listAuctioneers(),
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createAuction(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['auctions-all'] }); setShowForm(false); },
    onError: (err: any) => alert(err.response?.data?.error || 'Error al crear'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => adminApi.setAuctionStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['auctions-all'] }),
  });

  const auctions = auctionsData?.data?.data?.auctions ?? [];
  const auctioneers = auctioneersData?.data?.data?.auctioneers ?? [];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Subastas</h1>
        <button onClick={() => setShowForm(s => !s)} style={{ padding: '8px 16px' }}>
          {showForm ? 'Cancelar' : '+ Nueva subasta'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate(); }}
          style={{ border: '1px solid #eee', padding: 20, borderRadius: 8, marginBottom: 24 }}>
          <h3>Nueva Subasta</h3>
          {[['titulo', 'Título'], ['ubicacion', 'Ubicación']].map(([field, label]) => (
            <div key={field} style={{ marginBottom: 8 }}>
              <label>{label}<br />
                <input required value={(form as any)[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} style={{ width: '100%', padding: 8 }} />
              </label>
            </div>
          ))}
          <div style={{ marginBottom: 8 }}>
            <label>Fecha y hora<br />
              <input type="datetime-local" required value={form.fechaHora} onChange={e => setForm(f => ({ ...f, fechaHora: e.target.value }))} style={{ width: '100%', padding: 8 }} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            <label>Categoría<br />
              <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} style={{ padding: 8 }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>Moneda<br />
              <select value={form.moneda} onChange={e => setForm(f => ({ ...f, moneda: e.target.value }))} style={{ padding: 8 }}>
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label>Rematador<br />
              <select required value={form.rematadorId} onChange={e => setForm(f => ({ ...f, rematadorId: e.target.value }))} style={{ padding: 8 }}>
                <option value="">Seleccionar...</option>
                {auctioneers.map((a: any) => <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>)}
              </select>
            </label>
          </div>
          <button type="submit" disabled={createMutation.isPending} style={{ padding: '8px 24px' }}>
            {createMutation.isPending ? 'Creando...' : 'Crear subasta'}
          </button>
        </form>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8f9fa' }}>
            {['Título', 'Categoría', 'Moneda', 'Fecha', 'Estado', 'Acciones'].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {auctions.map((a: any) => (
            <tr key={a.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px 12px' }}>{a.titulo}</td>
              <td style={{ padding: '8px 12px' }}>{a.categoria}</td>
              <td style={{ padding: '8px 12px' }}>{a.moneda}</td>
              <td style={{ padding: '8px 12px' }}>{new Date(a.fechaHora).toLocaleDateString('es-AR')}</td>
              <td style={{ padding: '8px 12px' }}>{a.status}</td>
              <td style={{ padding: '8px 12px' }}>
                {STATUSES_TRANSITION[a.status]?.map(next => (
                  <button key={next} onClick={() => statusMutation.mutate({ id: a.id, status: next })}
                    style={{ marginRight: 4, padding: '4px 8px', fontSize: 12 }}>
                    → {next}
                  </button>
                ))}
                {a.status === 'abierta' && (
                  <Link to={`/admin/auctions/${a.id}/room`}>
                    <button style={{ padding: '4px 8px', fontSize: 12, background: '#007bff', color: 'white', border: 'none', borderRadius: 4 }}>
                      Control sala
                    </button>
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
