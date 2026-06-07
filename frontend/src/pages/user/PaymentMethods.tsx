import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { userApi } from '../../api/user.api';

const TIPOS = [
  'cuenta_bancaria_nacional', 'cuenta_bancaria_extranjera',
  'tarjeta_credito_nacional', 'tarjeta_credito_internacional', 'cheque_certificado',
];

export default function PaymentMethods() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tipo: TIPOS[0], moneda: 'ARS', banco: '', numeroCuenta: '', swift: '', numeroTarjeta: '', titularTarjeta: '', vencimiento: '', montoGarantia: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['payment-methods', user?.id],
    queryFn: () => userApi.getPaymentMethods(user!.id),
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: () => userApi.addPaymentMethod(user!.id, { ...form, montoGarantia: form.montoGarantia ? Number(form.montoGarantia) : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payment-methods', user?.id] }); setShowForm(false); },
    onError: (err: any) => alert(err.response?.data?.error || 'Error al agregar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (pmId: string) => userApi.deletePaymentMethod(user!.id, pmId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-methods', user?.id] }),
  });

  const pms = data?.data?.data?.paymentMethods ?? [];

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
      <h1>Medios de Pago</h1>
      {pms.length === 0 && !isLoading && <p>No tenés medios de pago registrados. Debés agregar al menos uno para pujar.</p>}
      {pms.map((pm: any) => (
        <div key={pm.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p><strong>{pm.tipo.replace(/_/g, ' ')}</strong> - {pm.moneda}</p>
            {pm.banco && <p>Banco: {pm.banco}</p>}
            {pm.numeroTarjeta && <p>Tarjeta: **** {pm.numeroTarjeta}</p>}
            {pm.montoGarantia && <p>Garantía: ${Number(pm.montoGarantia).toLocaleString()}</p>}
            <p>Estado: <span style={{ color: pm.verificado ? 'green' : 'orange' }}>{pm.verificado ? '✓ Verificado' : 'Pendiente de verificación'}</span></p>
          </div>
          <button onClick={() => deleteMutation.mutate(pm.id)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>Eliminar</button>
        </div>
      ))}
      <button onClick={() => setShowForm(s => !s)} style={{ padding: '8px 16px', marginBottom: 16 }}>
        {showForm ? 'Cancelar' : '+ Agregar medio de pago'}
      </button>
      {showForm && (
        <form onSubmit={e => { e.preventDefault(); addMutation.mutate(); }} style={{ border: '1px solid #eee', padding: 20, borderRadius: 8 }}>
          <div style={{ marginBottom: 8 }}>
            <label>Tipo<br />
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={{ width: '100%', padding: 8 }}>
                {TIPOS.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Moneda<br />
              <select value={form.moneda} onChange={e => setForm(f => ({ ...f, moneda: e.target.value }))} style={{ width: '100%', padding: 8 }}>
                <option value="ARS">ARS (Pesos)</option>
                <option value="USD">USD (Dólares)</option>
              </select>
            </label>
          </div>
          {(form.tipo.includes('bancaria')) && (
            <>
              <input placeholder="Banco" value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))} style={{ width: '100%', padding: 8, marginBottom: 8 }} />
              <input placeholder="Número de cuenta / CBU" value={form.numeroCuenta} onChange={e => setForm(f => ({ ...f, numeroCuenta: e.target.value }))} style={{ width: '100%', padding: 8, marginBottom: 8 }} />
              {form.tipo.includes('extranjera') && <input placeholder="SWIFT" value={form.swift} onChange={e => setForm(f => ({ ...f, swift: e.target.value }))} style={{ width: '100%', padding: 8, marginBottom: 8 }} />}
            </>
          )}
          {form.tipo.includes('tarjeta') && (
            <>
              <input placeholder="Últimos 4 dígitos" value={form.numeroTarjeta} onChange={e => setForm(f => ({ ...f, numeroTarjeta: e.target.value }))} style={{ width: '100%', padding: 8, marginBottom: 8 }} maxLength={4} />
              <input placeholder="Titular" value={form.titularTarjeta} onChange={e => setForm(f => ({ ...f, titularTarjeta: e.target.value }))} style={{ width: '100%', padding: 8, marginBottom: 8 }} />
              <input placeholder="Vencimiento (MM/AA)" value={form.vencimiento} onChange={e => setForm(f => ({ ...f, vencimiento: e.target.value }))} style={{ width: '100%', padding: 8, marginBottom: 8 }} />
            </>
          )}
          {form.tipo === 'cheque_certificado' && (
            <input type="number" placeholder="Monto de garantía" value={form.montoGarantia} onChange={e => setForm(f => ({ ...f, montoGarantia: e.target.value }))} style={{ width: '100%', padding: 8, marginBottom: 8 }} />
          )}
          <button type="submit" disabled={addMutation.isPending} style={{ width: '100%', padding: 10 }}>
            {addMutation.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      )}
    </div>
  );
}
