import { useState, FormEvent, ChangeEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../api/auth.api';

export default function RegisterStep1() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: '', apellido: '', domicilioLegal: '', paisOrigen: '',
  });
  const [files, setFiles] = useState<{ docFrente?: File; docDorso?: File }>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFile = (e: ChangeEvent<HTMLInputElement>, field: 'docFrente' | 'docDorso') => {
    const f = e.target.files?.[0];
    if (f) setFiles(prev => ({ ...prev, [field]: f }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!files.docFrente || !files.docDorso) {
      setError('Se requieren ambas fotos del documento');
      return;
    }
    setError(''); setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('docFrente', files.docFrente);
      fd.append('docDorso', files.docDorso);
      await authApi.register(fd);
      setSuccess('¡Registro enviado! La empresa verificará tus datos. Recibirás un email para completar el registro.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error en el registro');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ maxWidth: 500, margin: '80px auto', padding: 24 }}>
        <div style={{ background: '#d4edda', padding: 16, borderRadius: 4 }}>{success}</div>
        <p><Link to="/auth/login">Volver al login</Link></p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: 24 }}>
      <h2>Registro - Paso 1</h2>
      <p>Completá tus datos. La empresa verificará tu información.</p>
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        {(['nombre', 'apellido', 'domicilioLegal', 'paisOrigen'] as const).map(field => (
          <div key={field} style={{ marginBottom: 10 }}>
            <label style={{ textTransform: 'capitalize' }}>{field}<br />
              <input required value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                style={{ width: '100%', padding: 8 }} />
            </label>
          </div>
        ))}
        <div style={{ marginBottom: 10 }}>
          <label>Foto del documento (frente) *<br />
            <input type="file" accept="image/*" required onChange={e => handleFile(e, 'docFrente')} />
          </label>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Foto del documento (dorso) *<br />
            <input type="file" accept="image/*" required onChange={e => handleFile(e, 'docDorso')} />
          </label>
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10 }}>
          {loading ? 'Enviando...' : 'Enviar solicitud de registro'}
        </button>
      </form>
      <p><Link to="/auth/login">Ya tengo cuenta</Link></p>
    </div>
  );
}
