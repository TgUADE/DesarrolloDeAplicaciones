import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/icons/logo.svg';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  fontSize: 'var(--font-size-base)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-medium)',
  color: 'var(--color-text)',
  marginBottom: 6,
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/auctions');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Cabecera de marca */}
      <header
        style={{
          background: 'var(--gradient-brand)',
          color: 'var(--color-text-on-primary)',
          padding: '56px var(--space-lg) 40px',
          borderBottomLeftRadius: 'var(--radius-lg)',
          borderBottomRightRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-md)',
        }}
      >
        <img
          src={logo}
          alt="SubastApp"
          style={{ width: 88, height: 88, borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-elevated)' }}
        />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>SubastApp</div>
          <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.75, marginTop: 2 }}>Iniciá sesión para participar</div>
        </div>
      </header>

      {/* Formulario */}
      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: 'var(--space-lg)' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-card)',
              padding: 'var(--space-lg)',
              marginTop: 'calc(var(--space-lg) * -1.5)',
            }}
          >
            <h1 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-lg)' }}>Iniciar sesión</h1>

            {error && (
              <div
                style={{
                  background: 'rgba(226, 75, 74, 0.1)',
                  color: 'var(--color-danger)',
                  border: '1px solid var(--color-danger)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                  fontSize: 'var(--font-size-sm)',
                  marginBottom: 'var(--space-md)',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="tu@email.com"
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <label style={labelStyle}>Contraseña</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  style={inputStyle}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'var(--color-primary)',
                  color: 'var(--color-text-on-primary)',
                  fontSize: 'var(--font-size-base)',
                  fontWeight: 'var(--font-weight-medium)',
                  cursor: loading ? 'default' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            ¿No tenés cuenta?{' '}
            <Link to="/auth/register" style={{ color: 'var(--color-primary)', fontWeight: 'var(--font-weight-medium)' }}>
              Registrarse
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
