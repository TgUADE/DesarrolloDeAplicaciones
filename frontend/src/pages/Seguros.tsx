import { useEffect, useState } from 'react';
import {
  getSeguros, createSeguro, updateSeguro, deleteSeguro,
  assignProductToPolicy, unassignProductFromPolicy, getAllItems,
  type AdminSeguro, type AdminProducto,
} from '../api';

type Modal =
  | { type: 'create' }
  | { type: 'edit'; seguro: AdminSeguro }
  | { type: 'detail'; seguro: AdminSeguro }
  | { type: 'assign'; seguro: AdminSeguro };

export default function Seguros() {
  const [seguros, setSeguros] = useState<AdminSeguro[]>([]);
  const [allItems, setAllItems] = useState<AdminProducto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<Modal | null>(null);

  // Form state (create / edit)
  const [nroPoliza, setNroPoliza] = useState('');
  const [compania, setCompania] = useState('La Subastadora Seguros S.A.');
  const [importe, setImporte] = useState('');
  const [combinada, setCombinada] = useState(false);

  // Assign state
  const [assignId, setAssignId] = useState<number | ''>('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [sd, it] = await Promise.all([getSeguros(), getAllItems()]);
      setSeguros(sd.seguros);
      setAllItems(it.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setNroPoliza(''); setCompania('La Subastadora Seguros S.A.'); setImporte(''); setCombinada(false);
    setModal({ type: 'create' });
  };

  const openEdit = (s: AdminSeguro) => {
    setNroPoliza(s.nroPoliza); setCompania(s.compania); setImporte(String(s.importe)); setCombinada(s.polizaCombinada);
    setModal({ type: 'edit', seguro: s });
  };

  const openDetail = (s: AdminSeguro) => setModal({ type: 'detail', seguro: s });

  const openAssign = (s: AdminSeguro) => {
    setAssignId('');
    setModal({ type: 'assign', seguro: s });
  };

  const saveCreate = async () => {
    if (!nroPoliza.trim() || !compania.trim() || !importe) return;
    setSaving(true);
    setError('');
    try {
      await createSeguro({ nroPoliza: nroPoliza.trim(), compania: compania.trim(), importe: Number(importe), polizaCombinada: combinada });
      setModal(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear');
    } finally { setSaving(false); }
  };

  const saveEdit = async () => {
    if (modal?.type !== 'edit') return;
    setSaving(true);
    setError('');
    try {
      await updateSeguro(modal.seguro.nroPoliza, { compania: compania.trim(), importe: Number(importe), polizaCombinada: combinada });
      setModal(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleDelete = async (s: AdminSeguro) => {
    if (!confirm(`¿Eliminar la póliza ${s.nroPoliza}? Esta acción no se puede deshacer.`)) return;
    setError('');
    try {
      await deleteSeguro(s.nroPoliza);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  const handleUnassign = async (s: AdminSeguro, productoId: number) => {
    setError('');
    try {
      await unassignProductFromPolicy(s.nroPoliza, productoId);
      load();
      // Refresh detail modal
      const updated = (await getSeguros()).seguros.find((x) => x.nroPoliza === s.nroPoliza);
      if (updated) setModal({ type: 'detail', seguro: updated });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al desasignar');
    }
  };

  const handleAssign = async () => {
    if (modal?.type !== 'assign' || !assignId) return;
    setSaving(true);
    setError('');
    try {
      await assignProductToPolicy(modal.seguro.nroPoliza, Number(assignId));
      setModal(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al asignar');
    } finally { setSaving(false); }
  };

  // Dueño actual de la póliza (una póliza es por dueño): viene de seguros_app.
  const policyOwnerId = modal?.type === 'assign' ? modal.seguro.duenioId : null;

  // Items asignables: no asignados a esta póliza y —si la póliza ya tiene dueño— del mismo dueño.
  const availableItems = modal?.type === 'assign'
    ? allItems.filter((i) => {
        const seg = seguros.find((s) => s.productos.some((p) => p.identificador === i.identificador));
        const noEsDeEstaPoliza = !seg || seg.nroPoliza !== modal.seguro.nroPoliza;
        const mismoDuenio = policyOwnerId == null || i.duenioId === policyOwnerId;
        return noEsDeEstaPoliza && mismoDuenio;
      })
    : [];

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0 }).format(n);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Pólizas de seguro</h1>
          <p>Gestión de pólizas y asignación a productos ({seguros.length} pólizas)</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nueva póliza</button>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div className="spinner">Cargando...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nro. Póliza</th>
                  <th>Dueño</th>
                  <th>Compañía</th>
                  <th>Importe</th>
                  <th>Combinada</th>
                  <th>Productos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {seguros.length === 0 ? (
                  <tr className="empty-row"><td colSpan={7}>No hay pólizas registradas</td></tr>
                ) : (
                  seguros.map((s) => (
                    <tr key={s.nroPoliza}>
                      <td><strong>{s.nroPoliza}</strong></td>
                      <td>{s.duenio ? `${s.duenio.nombre} ${s.duenio.apellido}` : <span style={{ color: '#94a3b8' }}>—</span>}</td>
                      <td style={{ color: '#64748b' }}>{s.compania}</td>
                      <td><strong>${fmtMoney(s.importe)}</strong></td>
                      <td>
                        <span className={`badge ${s.polizaCombinada ? 'badge-blue' : 'badge-gray'}`}>
                          {s.polizaCombinada ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-secondary" onClick={() => openDetail(s)}>
                          {s.productos.length} producto{s.productos.length !== 1 ? 's' : ''}
                        </button>
                      </td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-primary" onClick={() => openEdit(s)}>Editar</button>
                        <button
                          className="btn btn-sm btn-danger"
                          disabled={s.productos.length > 0}
                          title={s.productos.length > 0 ? 'Desasigná los productos primero' : 'Eliminar póliza'}
                          onClick={() => handleDelete(s)}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Modal crear ── */}
      {modal?.type === 'create' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>🛡️ Nueva póliza</h2>
            <div className="form-group">
              <label>Nro. de póliza *</label>
              <input value={nroPoliza} onChange={(e) => setNroPoliza(e.target.value)} placeholder="POL-001" />
            </div>
            <div className="form-group">
              <label>Compañía aseguradora *</label>
              <input value={compania} onChange={(e) => setCompania(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Importe asegurado *</label>
              <input type="number" min={0} value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="0" />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={combinada} onChange={(e) => setCombinada(e.target.checked)} />
                Póliza combinada (cubre múltiples productos)
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving || !nroPoliza.trim() || !compania.trim() || !importe} onClick={saveCreate}>
                {saving ? 'Guardando...' : 'Crear póliza'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal editar ── */}
      {modal?.type === 'edit' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>✏️ Editar póliza</h2>
            <div className="info-grid">
              <div className="info-row"><span className="lbl">Nro. póliza</span><span className="val">{modal.seguro.nroPoliza}</span></div>
            </div>
            <div className="form-group">
              <label>Compañía aseguradora</label>
              <input value={compania} onChange={(e) => setCompania(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Importe asegurado</label>
              <input type="number" min={0} value={importe} onChange={(e) => setImporte(e.target.value)} />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={combinada} onChange={(e) => setCombinada(e.target.checked)} />
                Póliza combinada
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving} onClick={saveEdit}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal detalle / productos asignados ── */}
      {modal?.type === 'detail' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <h2>🛡️ {modal.seguro.nroPoliza}</h2>
            <div className="info-grid">
              <div className="info-row"><span className="lbl">Compañía</span><span className="val">{modal.seguro.compania}</span></div>
              <div className="info-row"><span className="lbl">Importe</span><span className="val">${fmtMoney(modal.seguro.importe)}</span></div>
              <div className="info-row">
                <span className="lbl">Combinada</span>
                <span className="val">
                  <span className={`badge ${modal.seguro.polizaCombinada ? 'badge-blue' : 'badge-gray'}`}>
                    {modal.seguro.polizaCombinada ? 'Sí' : 'No'}
                  </span>
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
              <strong>Productos asignados ({modal.seguro.productos.length})</strong>
              <button className="btn btn-sm btn-primary" onClick={() => openAssign(modal.seguro)}>+ Asignar producto</button>
            </div>

            {modal.seguro.productos.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: 14 }}>Sin productos asignados.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Pieza</th><th>Descripción</th><th>Dueño</th><th>Estado</th><th></th></tr>
                  </thead>
                  <tbody>
                    {modal.seguro.productos.map((p) => (
                      <tr key={p.identificador}>
                        <td><code style={{ fontSize: 12 }}>{p.numeroPieza ?? `#${p.identificador}`}</code></td>
                        <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.descripcionCompleta}</td>
                        <td style={{ color: '#64748b' }}>{p.duenio ? `${p.duenio.nombre} ${p.duenio.apellido}` : '—'}</td>
                        <td><span className="badge badge-gray">{p.status ?? '—'}</span></td>
                        <td>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleUnassign(modal.seguro, p.identificador)}>
                            Desasignar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal asignar producto ── */}
      {modal?.type === 'assign' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>📦 Asignar producto</h2>
            <p style={{ color: '#64748b', marginBottom: 12, fontSize: 14 }}>
              Póliza: <strong>{modal.seguro.nroPoliza}</strong>
              {modal.seguro.duenio && (
                <> · Dueño: <strong>{modal.seguro.duenio.nombre} {modal.seguro.duenio.apellido}</strong></>
              )}
            </p>
            {modal.seguro.duenioId != null ? (
              <p style={{ color: '#94a3b8', marginBottom: 12, fontSize: 13 }}>
                Solo se muestran productos del mismo dueño (una póliza es por dueño).
              </p>
            ) : (
              <p style={{ color: '#94a3b8', marginBottom: 12, fontSize: 13 }}>
                El primer producto que asignes va a fijar el dueño de esta póliza.
              </p>
            )}
            <div className="form-group">
              <label>Seleccioná un producto</label>
              <select value={assignId} onChange={(e) => setAssignId(Number(e.target.value) || '')}>
                <option value="">-- Elegir producto --</option>
                {availableItems.map((i) => {
                  const duenio = i.duenio?.persona;
                  return (
                    <option key={i.identificador} value={i.identificador}>
                      {i.numeroPieza ?? `#${i.identificador}`} — {i.descripcionCompleta}
                      {duenio ? ` (${duenio.nombre} ${duenio.apellido})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving || !assignId} onClick={handleAssign}>
                {saving ? 'Asignando...' : 'Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
