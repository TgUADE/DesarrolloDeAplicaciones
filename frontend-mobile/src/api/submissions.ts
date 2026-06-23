import client from '@/api/client';

export interface MySubmission {
  id: string;
  nombre: string | null;
  descripcion: string;
  artista: string | null;
  fechaEpoca: string | null;
  datosHistoricos: string | null;
  status: string;
  precioSugerido: number | string | null;
  precioBaseOfrecido: number | string | null;
  moneda: string | null;
  cuentaCobro: string | null;
  comisionesInfo: string | null;
  motivoRechazo: string | null;
  createdAt: string;
  images?: { url: string }[];
}

/**
 * Crea una solicitud para incluir un artículo en una futura subasta.
 * Las imágenes van como base64 (al menos 6), igual que en el registro.
 * `moneda` define en qué moneda está `precioSugerido` (según la cuenta de cobro elegida).
 */
export async function createSubmission(payload: {
  nombre?: string;
  descripcion: string;
  artista?: string;
  fechaEpoca?: string;
  datosHistoricos?: string;
  declaracionPropiedad: boolean;
  origenLicito: boolean;
  precioSugerido?: number;
  moneda?: 'ARS' | 'USD';
  cuentaCobro?: string;
  images: string[];
}): Promise<void> {
  await client.post('/submissions', payload);
}

export async function listMySubmissions(userId: string): Promise<MySubmission[]> {
  const res = await client.get(`/users/${userId}/submissions`);
  return res.data.data.submissions as MySubmission[];
}

/** El usuario acepta el precio base / comisiones propuestos por la empresa. */
export async function acceptSubmissionPrice(id: string): Promise<void> {
  await client.patch(`/submissions/${id}/user-accept`);
}

/** El usuario rechaza el precio propuesto (la empresa devuelve el bien con cargo). */
export async function rejectSubmissionPrice(id: string): Promise<void> {
  await client.patch(`/submissions/${id}/user-reject`);
}
