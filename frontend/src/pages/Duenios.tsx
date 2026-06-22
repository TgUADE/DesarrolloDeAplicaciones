import { useEffect, useState } from 'react';
import { getDuenios, verifyDuenio, type AdminDuenio } from '../api';

export default function Duenios() {
  const [duenios, setDuenios] = useState<AdminDuenio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [sel, setSel] = useState<AdminDuenio | null>(null);
  const [vf, setVf] = useState(false);
  const [vj, setVj] = useState(false);
  const [riesgo, setRiesgo] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const d = await getDuenios();
      setDuenios(d.duenios);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const open = (d: AdminDuenio) => {
    setSel(d);
    setVf(d.verificacionFinanciera);
    setVj(d.verificacionJudicial);
    setRiesgo(d.calificacionRiesgo ?? 1);
  };

  const save = async () => {
    if (!sel) return;
    setSaving(true);
    try {
      await verifyDuenio(sel.id, { verificacionFinanciera: vf, verificacionJudicial: vj, calificacionRiesgo: riesgo });
      setSel(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const yesNo = (b: boolean) => (
    <span className={`badge ${b ? 'badge-green' : 'badge-gray'}`}>{b ? 'Sí' : 'No'}</span>
  );

  return (
    <>
      <div className="page-header">
        <h1>Dueños</h1>
        <p>Verificación de propietarios de piezas ({duenios.length})</p>
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
                  <th>Dueño</th>
                  <th>Email</th>
                  <th>Verif. financiera</th>
                  <th>Verif. judicial</th>
                  <th>Riesgo (1-6)</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {duenios.length === 0 ? (
                  <tr className="empty-row"><td colSpan={6}>No hay dueños registrados</td></tr>
                ) : (
                  duenios.map((d) => (
                    <tr key={d.id}>
                      <td><strong>{d.nombre} {d.apellido}</strong></td>
                      <td style={{ color: '#64748b' }}>{d.email ?? '—'}</td>
                      <td>{yesNo(d.verificacionFinanciera)}</td>
                      <td>{yesNo(d.verificacionJudicial)}</td>
                      <td>{d.calificacionRiesgo ?? <span style={{ color: '#94a3b8' }}>—</span>}</td>
                      <td><button className="btn btn-sm btn-primary" onClick={() => open(d)}>Verificar</button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {sel && (
        <div className="modal-overlay" onClick={() => setSel(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>🏷️ Verificar dueño</h2>
            <div className="info-grid">
              <div className="info-row"><span className="lbl">Nombre</span><span className="val">{sel.nombre} {sel.apellido}</span></div>
              <div className="info-row"><span className="lbl">Email</span><span className="val">{sel.email ?? '—'}</span></div>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={vf} onChange={(e) => setVf(e.target.checked)} />
                Verificación financiera aprobada
              </label>
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={vj} onChange={(e) => setVj(e.target.checked)} />
                Verificación judicial aprobada
              </label>
            </div>
            <div className="form-group">
              <label>Calificación de riesgo (1 = mejor, 6 = peor)</label>
              <select value={riesgo} onChange={(e) => setRiesgo(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn btn-success" onClick={save} disabled={saving}>{saving ? 'Guardando...' : '💾 Guardar'}</button>
              <button className="btn btn-secondary" onClick={() => setSel(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
