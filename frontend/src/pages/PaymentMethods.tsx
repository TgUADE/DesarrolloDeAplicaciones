import { useEffect, useState } from 'react';
import { getPaymentMethods, verifyPaymentMethod, type AdminPaymentMethod } from '../api';

const TABS = [
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'aprobada', label: 'Aprobados' },
  { value: 'rechazada', label: 'Rechazados' },
  { value: '', label: 'Todos' },
];

const ESTADO_META: Record<string, { label: string; badge: string }> = {
  pendiente: { label: 'Pendiente', badge: 'badge-yellow' },
  aprobada: { label: 'Aprobado', badge: 'badge-green' },
  rechazada: { label: 'Rechazado', badge: 'badge-red' },
};

const TYPE_LABEL: Record<string, string> = {
  cuenta_bancaria_nacional: 'Cuenta bancaria nacional',
  cuenta_bancaria_extranjera: 'Cuenta bancaria extranjera',
  tarjeta_credito_nacional: 'Tarjeta de crédito nacional',
  tarjeta_credito_internacional: 'Tarjeta de crédito internacional',
  cheque_certificado: 'Cheque certificado',
};

interface Props {
  onCountChange: (n: number) => void;
}

export default function PaymentMethods({ onCountChange }: Props) {
  const [pms, setPms] = useState<AdminPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pendiente');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPaymentMethods(filter || undefined);
      setPms(data.paymentMethods);
      if (filter === 'pendiente') {
        onCountChange(data.paymentMethods.length);
      } else {
        const pend = await getPaymentMethods('pendiente');
        onCountChange(pend.paymentMethods.length);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const setEstado = async (pm: AdminPaymentMethod, estado: 'aprobada' | 'rechazada' | 'pendiente') => {
    setBusy(pm.id);
    setError('');
    try {
      await verifyPaymentMethod(pm.personaId, pm.id, estado);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al actualizar');
    } finally {
      setBusy(null);
    }
  };

  const datos = (pm: AdminPaymentMethod) => {
    if (pm.tipo.startsWith('tarjeta')) return `${pm.banco ?? ''} ····${pm.numeroTarjeta ?? ''}`.trim();
    if (pm.tipo === 'cheque_certificado') return `Garantía: ${pm.montoGarantia ?? '—'}`;
    return `${pm.banco ?? ''}${pm.numeroCuenta ? ` · ${pm.numeroCuenta}` : ''}`.trim() || '—';
  };

  return (
    <>
      <div className="page-header">
        <h1>Medios de pago</h1>
        <p>Validación de medios de pago de los clientes</p>
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
                  <th>Tipo</th>
                  <th>Moneda</th>
                  <th>Datos</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pms.length === 0 ? (
                  <tr className="empty-row"><td colSpan={6}>No hay medios de pago en este estado</td></tr>
                ) : (
                  pms.map((pm) => {
                    const m = ESTADO_META[pm.estado] ?? { label: pm.estado, badge: 'badge-gray' };
                    return (
                      <tr key={pm.id}>
                        <td>
                          <strong>{pm.persona ? `${pm.persona.nombre} ${pm.persona.apellido}` : '—'}</strong>
                          {pm.persona?.email ? <div style={{ color: '#94a3b8', fontSize: 11 }}>{pm.persona.email}</div> : null}
                        </td>
                        <td>{TYPE_LABEL[pm.tipo] ?? pm.tipo}</td>
                        <td><span className="badge badge-gray">{pm.moneda}</span></td>
                        <td style={{ color: '#64748b', fontSize: 13 }}>{datos(pm)}</td>
                        <td><span className={`badge ${m.badge}`}>{m.label}</span></td>
                        <td>
                          <div className="action-row">
                            {pm.estado !== 'aprobada' && (
                              <button className="btn btn-sm btn-success" disabled={busy === pm.id} onClick={() => setEstado(pm, 'aprobada')}>
                                {busy === pm.id ? '...' : '✓ Aprobar'}
                              </button>
                            )}
                            {pm.estado !== 'rechazada' && (
                              <button className="btn btn-sm btn-danger" disabled={busy === pm.id} onClick={() => setEstado(pm, 'rechazada')}>
                                {busy === pm.id ? '...' : '✗ Rechazar'}
                              </button>
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
