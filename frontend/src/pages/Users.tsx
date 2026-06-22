import { useEffect, useState } from 'react';
import { getUsers, approveUser, setUserStatus, setUserCategory, type PUser, type ApproveResult } from '../api';

const STATUS_TABS = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'aprobado', label: 'Aprobados' },
  { value: 'bloqueado', label: 'Bloqueados' },
];

const STATUS_BADGE: Record<string, string> = {
  pendiente: 'badge-yellow',
  aprobado: 'badge-green',
  bloqueado: 'badge-red',
};

const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  bloqueado: 'Bloqueado',
};

const CATEGORIAS = ['comun', 'especial', 'plata', 'oro', 'platino'];

interface Props {
  onCountChange: (n: number) => void;
}

export default function Users({ onCountChange }: Props) {
  const [users, setUsers] = useState<PUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pendiente');
  const [error, setError] = useState('');

  const [selected, setSelected] = useState<PUser | null>(null);
  const [categoria, setCategoria] = useState('comun');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ApproveResult | null>(null);
  const [copied, setCopied] = useState('');

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getUsers(filter || undefined);
      setUsers(data.users);
      setTotal(data.total ?? data.users.length);
      if (filter === 'pendiente') {
        onCountChange(data.total ?? data.users.length);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await approveUser(selected.id, categoria);
      setResult(res);
      setSelected(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al aprobar');
    } finally {
      setSaving(false);
    }
  };

  const handleBlock = async () => {
    if (!selected) return;
    if (!confirm(`¿Bloquear / rechazar a ${selected.nombre} ${selected.apellido}?`)) return;
    setSaving(true);
    try {
      await setUserStatus(selected.id, 'bloqueado');
      setSelected(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al bloquear');
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await setUserStatus(selected.id, 'aprobado');
      setSelected(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al reactivar');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeCategory = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await setUserCategory(selected.id, categoria);
      setSelected(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cambiar categoría');
    } finally {
      setSaving(false);
    }
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <>
      <div className="page-header">
        <h1>Usuarios</h1>
        <p>{total} usuario{total !== 1 ? 's' : ''} encontrados</p>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}

      <div className="tabs">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            className={`tab-btn ${filter === t.value ? 'active' : ''}`}
            onClick={() => setFilter(t.value)}>
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
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Estado</th>
                  <th>Categoría</th>
                  <th>Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr className="empty-row"><td colSpan={6}>No hay usuarios en este estado</td></tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td><strong>{u.nombre} {u.apellido}</strong></td>
                      <td style={{ color: '#64748b' }}>{u.email}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[u.status] ?? 'badge-gray'}`}>
                          {STATUS_LABEL[u.status] ?? u.status}
                        </span>
                      </td>
                      <td>{u.categoria ?? <span style={{ color: '#94a3b8' }}>—</span>}</td>
                      <td style={{ color: '#64748b' }}>{fmt(u.createdAt)}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => { setSelected(u); setCategoria(u.categoria ?? 'comun'); }}>
                          Gestionar
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

      {/* Manage modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>👤 Gestionar usuario</h2>
            <div className="info-grid">
              <div className="info-row"><span className="lbl">Nombre</span><span className="val">{selected.nombre} {selected.apellido}</span></div>
              <div className="info-row"><span className="lbl">Email</span><span className="val">{selected.email}</span></div>
              <div className="info-row">
                <span className="lbl">Estado actual</span>
                <span className="val">
                  <span className={`badge ${STATUS_BADGE[selected.status] ?? 'badge-gray'}`}>
                    {STATUS_LABEL[selected.status] ?? selected.status}
                  </span>
                </span>
              </div>
            </div>

            {selected.status !== 'bloqueado' && (
              <div className="form-group">
                <label>{selected.status === 'pendiente' ? 'Categoría a asignar' : 'Categoría'}</label>
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="modal-actions">
              {selected.status === 'pendiente' && (
                <>
                  <button className="btn btn-success" onClick={handleApprove} disabled={saving}>
                    {saving ? 'Guardando...' : '✅ Aprobar'}
                  </button>
                  <button className="btn btn-danger" onClick={handleBlock} disabled={saving}>
                    ❌ Rechazar
                  </button>
                </>
              )}
              {selected.status === 'aprobado' && (
                <>
                  <button className="btn btn-primary" onClick={handleChangeCategory} disabled={saving}>
                    {saving ? 'Guardando...' : '💾 Cambiar categoría'}
                  </button>
                  <button className="btn btn-danger" onClick={handleBlock} disabled={saving}>
                    🚫 Bloquear
                  </button>
                </>
              )}
              {selected.status === 'bloqueado' && (
                <button className="btn btn-success" onClick={handleReactivate} disabled={saving}>
                  {saving ? 'Guardando...' : '♻️ Reactivar (aprobar)'}
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Result modal with completion token */}
      {result && (
        <div className="modal-overlay" onClick={() => setResult(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>✅ Usuario aprobado</h2>
            <div className="info-grid">
              <div className="info-row"><span className="lbl">Nombre</span><span className="val">{result.user.nombre} {result.user.apellido}</span></div>
              <div className="info-row"><span className="lbl">Categoría</span><span className="val">{result.user.categoria}</span></div>
            </div>

            {result.completionToken && (
              <div className="token-section">
                <p>Token de completado</p>
                <div className="token-box">{result.completionToken}</div>
                <button
                  className="btn btn-sm btn-primary"
                  style={{ marginBottom: 16 }}
                  onClick={() => copy(result.completionToken!, 'token')}>
                  {copied === 'token' ? '✓ Copiado' : '📋 Copiar token'}
                </button>
              </div>
            )}

            {result.completionUrl && (
              <div className="token-section">
                <p>URL de completado (para compartir con el usuario)</p>
                <div className="token-box">{result.completionUrl}</div>
                <button
                  className="btn btn-sm btn-primary"
                  style={{ marginBottom: 16 }}
                  onClick={() => copy(result.completionUrl!, 'url')}>
                  {copied === 'url' ? '✓ Copiado' : '📋 Copiar URL'}
                </button>
              </div>
            )}

            {!result.completionToken && (
              <p style={{ color: '#64748b', fontSize: 13 }}>El usuario ya tiene contraseña configurada.</p>
            )}

            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setResult(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
