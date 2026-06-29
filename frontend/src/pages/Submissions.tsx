import { useEffect, useState } from 'react';
import {
  getSubmissions,
  offerSubmission,
  markSubmissionReceived,
  rejectSubmission,
  imageUrl,
  type Submission,
} from '../api';

const STATUS_TABS = [
  { value: 'pendiente_empresa', label: 'Por responder' },
  { value: '', label: 'Todas' },
];

const STATUS_META: Record<string, { label: string; badge: string }> = {
  pendiente_empresa: { label: 'En revisión', badge: 'badge-yellow' },
  oferta_inicial: { label: 'Oferta enviada', badge: 'badge-purple' },
  por_enviar: { label: 'Aceptó · a enviar', badge: 'badge-blue' },
  enviado: { label: 'Enviado', badge: 'badge-blue' },
  recibido: { label: 'Recibido · a tasar', badge: 'badge-purple' },
  aceptada_usuario: { label: 'Aceptada · disponible', badge: 'badge-green' },
  rechazada_empresa: { label: 'Rechazada (empresa)', badge: 'badge-red' },
  rechazada_usuario: { label: 'Rechazó la oferta', badge: 'badge-gray' },
  rechazada_final: { label: 'Rechazó la propuesta', badge: 'badge-gray' },
};

const money = (n?: number | string | null, moneda?: string | null) =>
  n != null && n !== ''
    ? Number(n).toLocaleString('es-AR', { style: 'currency', currency: moneda === 'USD' ? 'USD' : 'ARS', maximumFractionDigits: 0 })
    : '—';

interface Props {
  onCountChange: (n: number) => void;
}

type ActionType = 'offer' | 'reject' | null;

export default function Submissions({ onCountChange }: Props) {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pendiente_empresa');
  const [error, setError] = useState('');

  const [selected, setSelected] = useState<Submission | null>(null);
  const [action, setAction] = useState<ActionType>(null);
  const [direccion, setDireccion] = useState('');
  const [base, setBase] = useState('');
  const [fechaSubasta, setFechaSubasta] = useState('');
  const [comisionPct, setComisionPct] = useState('10');
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
      if (filter === 'pendiente_empresa') {
        onCountChange(data.submissions.length);
      } else {
        const pend = await getSubmissions('pendiente_empresa');
        onCountChange(pend.submissions.length);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const openOffer = (s: Submission) => {
    setSelected(s); setAction('offer'); setDireccion(''); setBase(''); setFechaSubasta('');
    setComisionPct('10'); setComisiones('Comisión de venta');
  };

  const handleOffer = async () => {
    if (!selected || !base || !fechaSubasta) return;
    setSaving(true);
    try {
      const fechaSubastaIso = new Date(fechaSubasta).toISOString();
      await offerSubmission(selected.id, parseFloat(base), parseFloat(comisionPct || '0'), fechaSubastaIso, comisiones, direccion || undefined);
      setAction(null); setSelected(null); setDireccion(''); setBase(''); setFechaSubasta('');
      load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error al enviar propuesta'); } finally { setSaving(false); }
  };

  const handleReceived = async (s: Submission) => {
    const deposito = window.prompt('Depósito donde queda guardada la pieza', 'Depósito Central');
    if (deposito === null) return;
    const ubicacion = window.prompt('Ubicación / estante de la pieza', '');
    if (ubicacion === null) return;
    setSaving(true);
    try {
      await markSubmissionReceived(s.id, deposito.trim() || undefined, ubicacion.trim() || undefined);
      setSelected(null);
      load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error'); } finally { setSaving(false); }
  };

  const handleReject = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await rejectSubmission(selected.id, motivo);
      setAction(null); setSelected(null); setMotivo('');
      load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error al rechazar'); } finally { setSaving(false); }
  };

  const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
  const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
  const meta = (st: string) => STATUS_META[st] ?? { label: st.replace(/_/g, ' '), badge: 'badge-gray' };
  const fotosCount = (s: Submission) => s._count?.images ?? s.images?.length ?? 0;
  // Valuación a mostrar en la tabla según la etapa.
  const valuacion = (s: Submission) =>
    s.precioBaseOfrecido != null ? money(s.precioBaseOfrecido, s.moneda) : s.valorOfrecido != null ? money(s.valorOfrecido, s.moneda) : '—';

  return (
    <>
      <div className="page-header">
        <h1>Solicitudes de venta</h1>
        <p>El admin envía precio base, fecha y comisión. Cuando recibe el bien, se asigna depósito y seguro automáticamente.</p>
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
                  <th>Valuación</th>
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
                        <td><strong>{valuacion(s)}</strong></td>
                        <td><span className={`badge ${m.badge}`}>{m.label}</span></td>
                        <td style={{ color: '#64748b' }}>{fmt(s.createdAt)}</td>
                        <td>
                          <div className="action-row">
                            {s.status === 'pendiente_empresa' && (
                              <button className="btn btn-sm btn-success" onClick={() => openOffer(s)}>Enviar propuesta</button>
                            )}
                            {s.status === 'enviado' && (
                              <button className="btn btn-sm btn-success" disabled={saving} onClick={() => handleReceived(s)}>Marcar recibido</button>
                            )}
                            <button className="btn btn-sm btn-primary" onClick={() => { setSelected(s); setAction(null); }}>Ver</button>
                          </div>
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
              <div className="info-row">
                <span className="lbl">Estado</span>
                <span className="val"><span className={`badge ${meta(selected.status).badge}`}>{meta(selected.status).label}</span></span>
              </div>
              {selected.valorOfrecido != null && selected.precioBaseOfrecido == null && (
                <div className="info-row"><span className="lbl">Valor ofrecido</span><span className="val">{money(selected.valorOfrecido, selected.moneda)}</span></div>
              )}
              {selected.precioBaseOfrecido != null && (
                <div className="info-row"><span className="lbl">Propuesta</span><span className="val"><strong>{money(selected.precioBaseOfrecido, selected.moneda)}</strong>{selected.comisionPorcentaje != null ? ` · comisión ${Number(selected.comisionPorcentaje)}%` : ''}</span></div>
              )}
              {selected.fechaSubastaEstimada && <div className="info-row"><span className="lbl">Fecha estimada de subasta</span><span className="val">{fmtDateTime(selected.fechaSubastaEstimada)}</span></div>}
              {selected.cuentaCobro && <div className="info-row"><span className="lbl">Cuenta destino</span><span className="val">{selected.cuentaCobro}</span></div>}
              {selected.enviadoAt && <div className="info-row"><span className="lbl">Enviado</span><span className="val">{fmt(selected.enviadoAt)}</span></div>}
              {selected.recibidoAt && <div className="info-row"><span className="lbl">Recibido</span><span className="val">{fmt(selected.recibidoAt)}</span></div>}
            </div>

            {selected.descripcion && (
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
            {['oferta_inicial', 'por_enviar'].includes(selected.status) && (
              <div style={{ background: '#eef2ff', borderRadius: 6, padding: '10px 14px', fontSize: 13, marginBottom: 16, color: '#3730a3' }}>
                {selected.status === 'oferta_inicial' && '⏳ Esperando que el vendedor acepte o rechace la propuesta.'}
                {selected.status === 'por_enviar' && '⏳ El vendedor aceptó. Esperando que envíe el ítem al depósito.'}
              </div>
            )}

            <div className="modal-actions">
              {selected.status === 'pendiente_empresa' && (
                <>
                  <button className="btn btn-success" onClick={() => openOffer(selected)}>💲 Enviar propuesta</button>
                  <button className="btn btn-danger" onClick={() => setAction('reject')}>❌ Rechazar</button>
                </>
              )}
              {selected.status === 'oferta_inicial' && (
                <button className="btn btn-danger" onClick={() => setAction('reject')}>❌ Rechazar</button>
              )}
              {selected.status === 'enviado' && (
                <button className="btn btn-success" disabled={saving} onClick={() => handleReceived(selected)}>📦 Marcar recibido</button>
              )}
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Offer action */}
      {selected && action === 'offer' && (
        <div className="modal-overlay" onClick={() => setAction(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>💲 Enviar propuesta</h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
              Cargá precio base, fecha estimada, comisión y dirección de envío. Si el vendedor acepta, envía la pieza para inspección.
            </p>
            <div className="form-group">
              <label>Precio base de salida ({selected.moneda || 'ARS'})</label>
              <input type="number" min="0" step="100" value={base} onChange={(e) => setBase(e.target.value)} placeholder="ej: 50000" autoFocus />
            </div>
            <div className="form-group">
              <label>Fecha estimada de subasta</label>
              <input type="datetime-local" value={fechaSubasta} onChange={(e) => setFechaSubasta(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Comisión (%)</label>
              <input type="number" min="0" max="100" step="0.5" value={comisionPct} onChange={(e) => setComisionPct(e.target.value)} placeholder="ej: 10" />
            </div>
            <div className="form-group">
              <label>Detalle de comisiones</label>
              <input value={comisiones} onChange={(e) => setComisiones(e.target.value)} placeholder="Ej: Comisión de venta + gastos" />
            </div>
            <div className="form-group">
              <label>Dirección de envío o retiro (opcional — hay una por defecto)</label>
              <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Casa Central — Av. Corrientes 1234, CABA" />
            </div>
            <div className="modal-actions">
              <button className="btn btn-success" onClick={handleOffer} disabled={saving || !base || !fechaSubasta}>{saving ? 'Guardando...' : 'Enviar propuesta'}</button>
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
