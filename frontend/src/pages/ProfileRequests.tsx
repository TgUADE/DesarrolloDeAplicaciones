import { useEffect, useState } from 'react';
import {
  getProfileChangeRequests,
  approveProfileChangeRequest,
  rejectProfileChangeRequest,
  type ProfileChangeRequest,
} from '../api';

const TABS = [
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'aprobada', label: 'Aprobadas' },
  { value: 'rechazada', label: 'Rechazadas' },
  { value: '', label: 'Todas' },
];

const ESTADO_META: Record<string, { label: string; badge: string }> = {
  pendiente: { label: 'Pendiente', badge: 'badge-yellow' },
  aprobada: { label: 'Aprobada', badge: 'badge-green' },
  rechazada: { label: 'Rechazada', badge: 'badge-red' },
};

const FIELDS: { key: 'nombre' | 'apellido' | 'domicilioLegal' | 'cuentaCobro'; label: string }[] = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'apellido', label: 'Apellido' },
  { key: 'domicilioLegal', label: 'Domicilio legal' },
  { key: 'cuentaCobro', label: 'Cuenta destino' },
];

interface Props {
  onCountChange: (n: number) => void;
}

export default function ProfileRequests({ onCountChange }: Props) {
  const [items, setItems] = useState<ProfileChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pendiente');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getProfileChangeRequests(filter || undefined);
      setItems(data.requests);
      if (filter === 'pendiente') {
        onCountChange(data.requests.length);
      } else {
        const pend = await getProfileChangeRequests('pendiente');
        onCountChange(pend.requests.length);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const onApprove = async (r: ProfileChangeRequest) => {
    setBusy(r.id);
    setError('');
    try {
      await approveProfileChangeRequest(r.id);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al aprobar');
    } finally {
      setBusy(null);
    }
  };

  const onReject = async (r: ProfileChangeRequest) => {
    const motivo = window.prompt('Motivo del rechazo (opcional):') ?? '';
    setBusy(r.id);
    setError('');
    try {
      await rejectProfileChangeRequest(r.id, motivo);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al rechazar');
    } finally {
      setBusy(null);
    }
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const meta = (st: string) => ESTADO_META[st] ?? { label: st, badge: 'badge-gray' };

  return (
    <>
      <div className="page-header">
        <h1>Solicitudes de datos</h1>
        <p>Cambios de datos de perfil pedidos por los usuarios (requieren aprobación)</p>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.value} className={`tab-btn ${filter === t.value ? 'active' : ''}`} onClick={() => setFilter(t.value)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div className="spinner">Cargando...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Cambios solicitados</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr className="empty-row"><td colSpan={5}>No hay solicitudes en este estado</td></tr>
                ) : (
                  items.map((r) => {
                    const m = meta(r.estado);
                    return (
                      <tr key={r.id}>
                        <td>
                          <strong>{r.persona ? `${r.persona.nombre} ${r.persona.apellido}` : '—'}</strong>
                          {r.persona?.email ? <div style={{ color: '#94a3b8', fontSize: 11 }}>{r.persona.email}</div> : null}
                        </td>
                        <td>
                          {FIELDS.map((f) => {
                            const nuevo = (r[f.key] ?? '') as string;
                            const actual = (r.actual?.[f.key] ?? '') as string;
                            const changed = nuevo !== actual;
                            return (
                              <div key={f.key} style={{ fontSize: 12, marginBottom: 2, opacity: changed ? 1 : 0.45 }}>
                                <span style={{ color: '#64748b' }}>{f.label}: </span>
                                {changed ? (
                                  <>
                                    <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{actual || '—'}</span>
                                    <span style={{ color: '#1d4e89', fontWeight: 600 }}> → {nuevo || '—'}</span>
                                  </>
                                ) : (
                                  <span>{actual || '—'} <span style={{ color: '#cbd5e1' }}>(sin cambio)</span></span>
                                )}
                              </div>
                            );
                          })}
                          {r.estado === 'rechazada' && r.motivoRechazo ? (
                            <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 4 }}>Motivo: {r.motivoRechazo}</div>
                          ) : null}
                        </td>
                        <td><span className={`badge ${m.badge}`}>{m.label}</span></td>
                        <td style={{ color: '#64748b' }}>{fmt(r.createdAt)}</td>
                        <td>
                          {r.estado === 'pendiente' ? (
                            <div className="action-row">
                              <button className="btn btn-sm btn-success" disabled={busy === r.id} onClick={() => onApprove(r)}>
                                {busy === r.id ? '...' : '✓ Aprobar'}
                              </button>
                              <button className="btn btn-sm btn-danger" disabled={busy === r.id} onClick={() => onReject(r)}>
                                {busy === r.id ? '...' : '✗ Rechazar'}
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: 12 }}>Resuelta</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
