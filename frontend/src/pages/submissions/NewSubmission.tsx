import { useState, FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { submissionApi } from '../../api/submission.api';

export default function NewSubmission() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    descripcion: '', datosHistoricos: '', cuentaCobro: '',
    declaracionPropiedad: false, origenLicito: false,
  });
  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImages = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setImages(Array.from(e.target.files));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.declaracionPropiedad) { setError('Debés declarar que el bien te pertenece'); return; }
    if (images.length < 6) { setError('Se requieren al menos 6 imágenes'); return; }
    setError(''); setLoading(true);
    try {
      const fd = new FormData();
      fd.append('descripcion', form.descripcion);
      fd.append('datosHistoricos', form.datosHistoricos);
      fd.append('cuentaCobro', form.cuentaCobro);
      fd.append('declaracionPropiedad', String(form.declaracionPropiedad));
      fd.append('origenLicito', String(form.origenLicito));
      images.forEach(img => fd.append('images', img));
      const { data } = await submissionApi.create(fd);
      navigate(`/submissions/${data.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al enviar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <h1>Solicitar inclusión de artículo en subasta</h1>
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Descripción del bien *<br />
            <textarea required rows={4} value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              style={{ width: '100%', padding: 8 }} />
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Historia / datos de interés<br />
            <textarea rows={3} value={form.datosHistoricos}
              onChange={e => setForm(f => ({ ...f, datosHistoricos: e.target.value }))}
              style={{ width: '100%', padding: 8 }} />
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Cuenta bancaria para recibir el pago *<br />
            <input required value={form.cuentaCobro}
              onChange={e => setForm(f => ({ ...f, cuentaCobro: e.target.value }))}
              placeholder="CBU / IBAN / cuenta de destino"
              style={{ width: '100%', padding: 8 }} />
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>
            <input type="checkbox" checked={form.declaracionPropiedad}
              onChange={e => setForm(f => ({ ...f, declaracionPropiedad: e.target.checked }))} />
            {' '}Declaro que el bien me pertenece y no posee ningún impedimento legal para su subasta *
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>
            <input type="checkbox" checked={form.origenLicito}
              onChange={e => setForm(f => ({ ...f, origenLicito: e.target.checked }))} />
            {' '}Confirmo que puedo acreditar el origen lícito del bien si fuera requerido
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Fotos del bien (mínimo 6) *<br />
            <input type="file" accept="image/*" multiple required onChange={handleImages} />
            {images.length > 0 && <p>{images.length} imagen(es) seleccionada(s)</p>}
          </label>
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 12 }}>
          {loading ? 'Enviando...' : 'Enviar solicitud'}
        </button>
      </form>
    </div>
  );
}
