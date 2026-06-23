import { useEffect, useState } from 'react';
import { getAuctioneers, createAuctioneer, updateAuctioneer, type Auctioneer } from '../api';

const EMPTY = { nombre: '', apellido: '', email: '', matricula: '', region: '' };

export default function Auctioneers() {
  const [items, setItems] = useState<Auctioneer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Auctioneer | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAuctioneers(true); // todos (incl. inactivos)
      setItems(data.auctioneers);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setForm({ ...EMPTY }); setEditing(null); setModal('create'); };
  const openEdit = (a: Auctioneer) => {
    setEditing(a);
    setForm({ nombre: a.nombre, apellido: a.apellido, email: a.email ?? '', matricula: a.matricula ?? '', region: a.region ?? '' });
    setModal('edit');
  };

  const save = async () => {
    if (!form.nombre.trim() || !form.apellido.trim() || !form.matricula.trim()) {
      setError('Nombre, apellido y matrícula son obligatorios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (modal === 'create') {
        await createAuctioneer({ nombre: form.nombre.trim(), apellido: form.apellido.trim(), email: form.email.trim() || undefined, matricula: form.matricula.trim(), region: form.region.trim() });
      } else if (editing) {
        await updateAuctioneer(editing.id, { nombre: form.nombre.trim(), apellido: form.apellido.trim(), matricula: form.matricula.trim(), region: form.region.trim() });
      }
      setModal(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (a: Auctioneer) => {
    setBusy(a.id);
    setError('');
    try {
      await updateAuctioneer(a.id, { activo: !a.activo });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Subastadores</h1>
        <p>Martilleros disponibles para asignar a las subastas</p>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}

      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={openCreate}>➕ Nuevo subastador</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div className="spinner">Cargando...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Subastador</th>
                  <th>Matrícula</th>
                  <th>Región</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr className="empty-row"><td colSpan={5}>No hay subastadores. Creá el primero.</td></tr>
                ) : (
                  items.map((a) => (
                    <tr key={a.id} style={{ opacity: a.activo ? 1 : 0.55 }}>
                      <td>
                        <strong>{a.nombre} {a.apellido}</strong>
                        {a.email ? <div style={{ color: '#94a3b8', fontSize: 11 }}>{a.email}</div> : null}
                      </td>
                      <td>{a.matricula ?? '—'}</td>
                      <td style={{ color: '#64748b' }}>{a.region ?? '—'}</td>
                      <td><span className={`badge ${a.activo ? 'badge-green' : 'badge-gray'}`}>{a.activo ? 'Activo' : 'Inactivo'}</span></td>
                      <td>
                        <div className="action-row">
                          <button className="btn btn-sm btn-primary" onClick={() => openEdit(a)}>Editar</button>
                          <button
                            className={`btn btn-sm ${a.activo ? 'btn-danger' : 'btn-success'}`}
                            disabled={busy === a.id}
                            onClick={() => toggleActivo(a)}>
                            {busy === a.id ? '...' : a.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{modal === 'create' ? '➕ Nuevo subastador' : '✏️ Editar subastador'}</h2>
            <div className="form-group">
              <label>Nombre *</label>
              <input value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} autoFocus />
            </div>
            <div className="form-group">
              <label>Apellido *</label>
              <input value={form.apellido} onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))} />
            </div>
            {modal === 'create' && (
              <div className="form-group">
                <label>Email</label>
                <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="opcional" />
              </div>
            )}
            <div className="form-group">
              <label>Matrícula *</label>
              <input value={form.matricula} onChange={(e) => setForm((f) => ({ ...f, matricula: e.target.value }))} placeholder="ej: MAT-004" />
            </div>
            <div className="form-group">
              <label>Región</label>
              <input value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} placeholder="ej: CABA" />
            </div>
            <div className="modal-actions">
              <button className="btn btn-success" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
