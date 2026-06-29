import { useEffect, useState } from 'react';
import { getPurchases, markPurchasePaid, applyFine, markPurchaseShipped, markPurchaseDelivered, type Purchase } from '../api';

const STATUS_TABS = [
  { value: '', label: 'Todas' },
  { value: 'pendiente_pago', label: 'Pendiente pago' },
  { value: 'pagado', label: 'Pagadas' },
  { value: 'multa_aplicada', label: 'Multadas' },
  { value: 'derivado_justicia', label: 'Justicia' },
];

const STATUS_BADGE: Record<string, string> = {
  pendiente_pago: 'badge-yellow',
  pagado: 'badge-green',
  multa_aplicada: 'badge-red',
  derivado_justicia: 'badge-red',
};

const TIPO_LABEL: Record<string, string> = {
  cuenta_bancaria_nacional: 'Cuenta nacional',
  cuenta_bancaria_extranjera: 'Cuenta extranjera',
  tarjeta_credito_nacional: 'Tarjeta nacional',
  tarjeta_credito_internacional: 'Tarjeta internacional',
  cheque_certificado: 'Cheque certificado',
};

export default function Purchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPurchases(filter || undefined);
      setPurchases(data.purchases);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handlePaid = async (id: number) => {
    try { await markPurchasePaid(id); load(); } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error'); }
  };
  const handleFine = async (id: number) => {
    if (!confirm('¿Aplicar multa a esta compra?')) return;
    try { await applyFine(id); load(); } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error'); }
  };
  const handleShipped = async (id: number) => {
    try { await markPurchaseShipped(id); load(); } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error'); }
  };
  const handleDelivered = async (id: number) => {
    try { await markPurchaseDelivered(id); load(); } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error'); }
  };
  const ENVIO_LABEL: Record<string, string> = { pendiente: 'Por enviar', enviado: 'Enviado', recibido: 'Recibido' };

  const fmt = (d: string) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const money = (n: number, cur = 'ARS') =>
    Number(n || 0).toLocaleString('es-AR', { style: 'currency', currency: cur, maximumFractionDigits: 0 });

  return (
    <>
      <div className="page-header">
        <h1>Compras</h1>
        <p>Artículos adjudicados en subastas</p>
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
                  <th>#</th>
                  <th>Comprador</th>
                  <th>Artículo</th>
                  <th>Total</th>
                  <th>Medio de pago</th>
                  <th>Depósito</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <tr className="empty-row"><td colSpan={8}>No hay compras en este estado</td></tr>
                ) : (
                  purchases.map((p) => {
                    const persona = p.cliente?.persona;
                    const cur = p.moneda ?? 'ARS';
                    const multa = Number(p.multa ?? 0);
                    const total = Number(p.importe) + Number(p.comision) + Number(p.costoEnvio ?? 0) + multa;
                    return (
                      <tr key={p.identificador}>
                        <td style={{ color: '#94a3b8' }}>#{p.identificador}</td>
                        <td>
                          {persona
                            ? <><strong>{persona.nombre} {persona.apellido}</strong><br /><span style={{ color: '#94a3b8', fontSize: 11 }}>{persona.email}</span></>
                            : <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.producto?.descripcionCatalogo ?? p.producto?.numeroPieza ?? '—'}
                        </td>
                        <td>
                          <strong>{money(total, cur)}</strong>
                          <br /><span style={{ color: '#94a3b8', fontSize: 11 }}>+ envío {money(Number(p.costoEnvio ?? 0), cur)}</span>
                          {multa > 0 ? <><br /><span style={{ color: '#dc2626', fontSize: 11 }}>+ multa {money(multa, cur)}</span></> : null}
                        </td>
                        <td style={{ fontSize: 12, color: '#64748b' }}>
                          {p.medioPago ? `${TIPO_LABEL[p.medioPago.tipo] ?? p.medioPago.tipo}${p.medioPago.banco ? ` · ${p.medioPago.banco}` : ''}` : '—'}
                        </td>
                        <td style={{ fontSize: 12, color: '#64748b' }}>{p.producto?.deposito ?? '—'}</td>
                        <td>
                          <span className={`badge ${STATUS_BADGE[p.status] ?? 'badge-gray'}`}>{p.status.replace(/_/g, ' ')}</span>
                          {p.retiraPersonalmente ? (
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>retiro personal</div>
                          ) : p.status === 'pagado' ? (
                            <div style={{ fontSize: 10, color: '#64748b' }}>Envío: {ENVIO_LABEL[p.envioEstado ?? 'pendiente'] ?? p.envioEstado}</div>
                          ) : null}
                        </td>
                        <td>
                          <div className="action-row">
                            {(p.status === 'pendiente_pago' || p.status === 'multa_aplicada') && (
                              <>
                                <button className="btn btn-sm btn-success" onClick={() => handlePaid(p.identificador)}>💵 Marcar pagada</button>
                                {p.status === 'pendiente_pago' && (
                                  <button className="btn btn-sm btn-warning" onClick={() => handleFine(p.identificador)}>⚠️ Multar</button>
                                )}
                              </>
                            )}
                            {p.status === 'pagado' && !p.retiraPersonalmente && (p.envioEstado ?? 'pendiente') === 'pendiente' && (
                              <button className="btn btn-sm btn-primary" onClick={() => handleShipped(p.identificador)}>📦 Enviado</button>
                            )}
                            {p.status === 'pagado' && !p.retiraPersonalmente && p.envioEstado === 'enviado' && (
                              <button className="btn btn-sm btn-success" onClick={() => handleDelivered(p.identificador)}>✅ Recibido</button>
                            )}
                            {p.status === 'pagado' && !p.retiraPersonalmente && p.envioEstado === 'recibido' && (
                              <span style={{ fontSize: 12, color: '#16a34a' }}>Entregado ✓</span>
                            )}
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
    </>
  );
}
