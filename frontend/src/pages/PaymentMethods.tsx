import { useEffect, useState } from 'react';
import { getPaymentMethods, verifyPaymentMethod, type AdminPaymentMethod } from '../api';

const TABS = [
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'verificado', label: 'Verificados' },
  { value: '', label: 'Todos' },
];

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
      const verificado = filter === '' ? undefined : filter === 'verificado';
      const data = await getPaymentMethods(verificado);
      setPms(data.paymentMethods);
      // Mantener el badge de pendientes al día.
      if (filter === 'pendiente') {
        onCountChange(data.paymentMethods.length);
      } else {
        const pend = await getPaymentMethods(false);
        onCountChange(pend.paymentMethods.length);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const setVerified = async (pm: AdminPaymentMethod, value: boolean) => {
    setBusy(pm.id);
    setError('');
    try {
      await verifyPaymentMethod(pm.personaId, pm.id, value);
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
        <p>{pms.length} medio{pms.length !== 1 ? 's' : ''} de pago</p>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}

      <div className="tabs">
        {TABS.map((t) => (
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
                  <th>Usuario</th>
                  <th>Tipo</th>
                  <th>Moneda</th>
                  <th>Datos</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {pms.length === 0 ? (
                  <tr className="empty-row"><td colSpan={6}>No hay medios de pago en este estado</td></tr>
                ) : (
                  pms.map((pm) => (
                    <tr key={pm.id}>
                      <td>
                        <strong>{pm.persona ? `${pm.persona.nombre} ${pm.persona.apellido}` : '—'}</strong>
                        {pm.persona?.email ? <div style={{ color: '#64748b', fontSize: 12 }}>{pm.persona.email}</div> : null}
                      </td>
                      <td>{TYPE_LABEL[pm.tipo] ?? pm.tipo}</td>
                      <td><span className="badge badge-gray">{pm.moneda}</span></td>
                      <td style={{ color: '#64748b', fontSize: 13 }}>{datos(pm)}</td>
                      <td>
                        <span className={`badge ${pm.verificado ? 'badge-green' : 'badge-yellow'}`}>
                          {pm.verificado ? 'Verificado' : 'Pendiente'}
                        </span>
                      </td>
                      <td>
                        {pm.verificado ? (
                          <button className="btn btn-sm btn-secondary" disabled={busy === pm.id} onClick={() => setVerified(pm, false)}>
                            {busy === pm.id ? '...' : 'Quitar verificación'}
                          </button>
                        ) : (
                          <button className="btn btn-sm btn-success" disabled={busy === pm.id} onClick={() => setVerified(pm, true)}>
                            {busy === pm.id ? '...' : '✓ Verificar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
