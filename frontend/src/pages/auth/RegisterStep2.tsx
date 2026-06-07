import { useState, FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../../api/auth.api';

export default function RegisterStep2() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return; }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    setError(''); setLoading(true);
    try {
      await authApi.completeRegistration({ token, email: form.email, password: form.password });
      navigate('/auth/login?registered=1');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al completar el registro');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24 }}>
      <p>Token inválido. <Link to="/auth/login">Volver al login</Link></p>
    </div>
  );

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24 }}>
      <h2>Completar Registro</h2>
      <p>Tu cuenta fue aprobada. Generá tu contraseña para acceder.</p>
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 10 }}>
          <label>Email<br />
            <input type="email" required value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              style={{ width: '100%', padding: 8 }} />
          </label>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Contraseña (mín. 8 caracteres)<br />
            <input type="password" required value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              style={{ width: '100%', padding: 8 }} />
          </label>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Confirmar contraseña<br />
            <input type="password" required value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              style={{ width: '100%', padding: 8 }} />
          </label>
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10 }}>
          {loading ? 'Guardando...' : 'Completar registro'}
        </button>
      </form>
    </div>
  );
}
