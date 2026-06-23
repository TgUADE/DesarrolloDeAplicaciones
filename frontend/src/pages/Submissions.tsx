import { useEffect, useState } from 'react';
import { getSubmissions, acceptSubmission, rejectSubmission, imageUrl, type Submission } from '../api';

const STATUS_TABS = [
  { value: '', label: 'Todas' },
  { value: 'pendiente_empresa', label: 'Pendientes' },
  { value: 'precio_propuesto', label: 'Contraoferta' },
  { value: 'aceptada_usuario', label: 'Aceptadas' },
  { value: 'rechazada_empresa', label: 'Rechazadas' },
];

const STATUS_META: Record<string, { label: string; badge: string }> = {
  pendiente_empresa: { label: 'Pendiente', badge: 'badge-yellow' },
  interesada: { label: 'Interesada', badge: 'badge-blue' },
  precio_propuesto: { label: 'Contraoferta', badge: 'badge-purple' },
  aceptada_usuario: { label: 'Aceptada', badge: 'badge-green' },
  rechazada_empresa: { label: 'Rechazada', badge: 'badge-red' },
  rechazada_usuario: { label: 'Rechazada (usuario)', badge: 'badge-gray' },
};

const money = (n?: number | string | null, moneda?: string | null) =>
  n != null && n !== ''
    ? Number(n).toLocaleString('es-AR', { style: 'currency', currency: moneda === 'USD' ? 'USD' : 'ARS', maximumFractionDigits: 0 })
    : '—';

interface Props {
  onCountChange: (n: number) => void;
}

export default function Submissions({ onCountChange }: Props) {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pendiente_empresa');
  const [error, setError] = useState('');

  const [selected, setSelected] = useState<Submission | null>(null);
  const [action, setAction] = useState<'accept' | 'reject' | null>(null);
  const [precio, setPrecio] = useState('');
  const [comisiones, setComisiones] = useState('');
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSubmissions(filter || undefined);
      setItems(data.submissions);
      if (filter === 'pendiente_empresa') onCountChange(data.submissions.length);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const openAccept = (s: Submission) => {
    setSelected(s);
    setAction('accept');
    setPrecio(s.precioSugerido != null ? String(s.precioSugerido) : '');
    setComisiones('Comisión de venta: 5%');
  };

  const handleAccept = async () => {
    if (!selected || !precio) return;
    setSaving(true);
    try {
      await acceptSubmission(selected.id, parseFloat(precio), comisiones);
      setAction(null); setSelected(null); setPrecio('');
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al aceptar');
    } finally { setSaving(false); }
  };

  const handleReject = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await rejectSubmission(selected.id, motivo);
      setAction(null); setSelected(null); setMotivo('');
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al rechazar');
    } finally { setSaving(false); }
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const meta = (st: string) => STATUS_META[st] ?? { label: st.replace(/_/g, ' '), badge: 'badge-gray' };
  const canDecide = (st: string) => ['pendiente_empresa', 'interesada', 'precio_propuesto'].includes(st);
  const fotosCount = (s: Submission) => s._count?.images ?? s.images?.length ?? 0;

  return (
    <>
      <div className="page-header">
        <h1>Solicitudes de venta</h1>
        <p>Artículos que usuarios quieren ingresar a subasta</p>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}

      <div className="tabs">
        {STATUS_TABS.map((t) => (
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
                  <th>Pieza</th>
                  <th>Usuario</th>
                  <th>Precio pedido</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr className="empty-row"><td colSpan={6}>No hay solicitudes en este estado</td></tr>
                ) : (
                  items.map((s) => {
                    const thumb = imageUrl(s.images?.[0]?.url);
                    const m = meta(s.status);
                    return (
                      <tr key={s.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {thumb ? (
                              <img src={thumb} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 40, height: 40, borderRadius: 6, background: '#e2e8f0', flexShrink: 0 }} />
                            )}
                            <div style={{ maxWidth: 220 }}>
                              <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nombre || s.descripcion}</strong>
                              <span style={{ color: '#94a3b8', fontSize: 11 }}>{s.artista ? `${s.artista} · ` : ''}{fotosCount(s)} foto{fotosCount(s) !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          {s.persona
                            ? <><strong>{s.persona.nombre} {s.persona.apellido}</strong><br /><span style={{ color: '#94a3b8', fontSize: 11 }}>{s.persona.email}</span></>
                            : <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        <td><strong>{money(s.precioSugerido, s.moneda)}</strong></td>
                        <td><span className={`badge ${m.badge}`}>{m.label}</span></td>
                        <td style={{ color: '#64748b' }}>{fmt(s.createdAt)}</td>
                        <td>
                          <button className="btn btn-sm btn-primary" onClick={() => { setSelected(s); setAction(null); }}>Ver</button>
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

      {/* Detail modal */}
      {selected && !action && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ width: 560 }} onClick={(e) => e.stopPropagation()}>
            <h2>📦 {selected.nombre || selected.descripcion}</h2>
            <div className="info-grid">
              {selected.persona && (
                <>
                  <div className="info-row"><span className="lbl">Usuario</span><span className="val">{selected.persona.nombre} {selected.persona.apellido}</span></div>
                  <div className="info-row"><span className="lbl">Email</span><span className="val">{selected.persona.email}</span></div>
                </>
              )}
              {selected.artista && <div className="info-row"><span className="lbl">Artista / diseñador</span><span className="val">{selected.artista}</span></div>}
              {selected.fechaEpoca && <div className="info-row"><span className="lbl">Fecha / Época</span><span className="val">{selected.fechaEpoca}</span></div>}
              <div className="info-row"><span className="lbl">Precio pedido</span><span className="val"><strong>{money(selected.precioSugerido, selected.moneda)}</strong>{selected.moneda ? ` ${selected.moneda}` : ''}</span></div>
              {selected.precioBaseOfrecido != null && (
                <div className="info-row"><span className="lbl">Precio acordado</span><span className="val">{money(selected.precioBaseOfrecido, selected.moneda)}</span></div>
              )}
              {selected.cuentaCobro && <div className="info-row"><span className="lbl">Cuenta destino</span><span className="val">{selected.cuentaCobro}</span></div>}
              <div className="info-row">
                <span className="lbl">Estado</span>
                <span className="val"><span className={`badge ${meta(selected.status).badge}`}>{meta(selected.status).label}</span></span>
              </div>
            </div>

            {selected.nombre && selected.descripcion && (
              <div className="form-group">
                <label>Descripción</label>
                <p style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 6, fontSize: 13, lineHeight: 1.5 }}>{selected.descripcion}</p>
              </div>
            )}

            {selected.datosHistoricos && (
              <div className="form-group">
                <label>Historia del objeto</label>
                <p style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 6, fontSize: 13, lineHeight: 1.5 }}>{selected.datosHistoricos}</p>
              </div>
            )}

            {selected.images && selected.images.length > 0 && (
              <div className="form-group">
                <label>Fotos</label>
                <div className="thumbs">
                  {selected.images.map((f, i) => {
                    const u = imageUrl(f.url);
                    return <img key={i} src={u} alt="" className="thumb" onClick={() => u && setLightboxImg(u)} />;
                  })}
                </div>
              </div>
            )}

            {selected.motivoRechazo && (
              <div style={{ background: '#fee2e2', borderRadius: 6, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
                <strong>Motivo de rechazo:</strong> {selected.motivoRechazo}
              </div>
            )}

            <div className="modal-actions">
              {canDecide(selected.status) && (
                <>
                  <button className="btn btn-success" onClick={() => openAccept(selected)}>✅ Aceptar</button>
                  <button className="btn btn-danger" onClick={() => setAction('reject')}>❌ Rechazar</button>
                </>
              )}
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Accept action */}
      {selected && action === 'accept' && (
        <div className="modal-overlay" onClick={() => setAction(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>✅ Aceptar solicitud</h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              El solicitante pide <strong>{money(selected.precioSugerido, selected.moneda)}</strong>
              {selected.cuentaCobro ? <> en la cuenta <strong>{selected.cuentaCobro}</strong></> : null}. Confirmá el precio base de salida
              (podés ajustarlo). Al aceptar, la pieza queda disponible para una futura subasta.
            </p>
            <div className="form-group">
              <label>Precio base de salida ({selected.moneda || 'ARS'})</label>
              <input type="number" min="0" step="100" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="ej: 50000" autoFocus />
            </div>
            <div className="form-group">
              <label>Comisiones (texto informativo)</label>
              <input value={comisiones} onChange={(e) => setComisiones(e.target.value)} placeholder="Ej: Comisión de venta 5%" />
            </div>
            <div className="modal-actions">
              <button className="btn btn-success" onClick={handleAccept} disabled={saving || !precio}>
                {saving ? 'Guardando...' : 'Confirmar y aceptar'}
              </button>
              <button className="btn btn-secondary" onClick={() => setAction(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject action */}
      {selected && action === 'reject' && (
        <div className="modal-overlay" onClick={() => setAction(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>❌ Rechazar solicitud</h2>
            <div className="form-group">
              <label>Motivo de rechazo (opcional)</label>
              <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: El artículo no cumple los requisitos mínimos de valuación..." autoFocus />
            </div>
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={handleReject} disabled={saving}>{saving ? 'Guardando...' : 'Confirmar rechazo'}</button>
              <button className="btn btn-secondary" onClick={() => setAction(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div className="modal-overlay" onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }} alt="" />
        </div>
      )}
    </>
  );
}
