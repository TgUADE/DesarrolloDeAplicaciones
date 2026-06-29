import client from '@/api/client';

export interface MySubmission {
  id: string;
  nombre: string | null;
  descripcion: string;
  artista: string | null;
  fechaEpoca: string | null;
  datosHistoricos: string | null;
  status: string;
  valorOfrecido: number | string | null;
  precioBaseOfrecido: number | string | null;
  comisionPorcentaje: number | string | null;
  fechaSubastaEstimada: string | null;
  moneda: string | null;
  cuentaCobro: string | null;
  comisionesInfo: string | null;
  motivoRechazo: string | null;
  direccionEnvio: string | null;
  enviadoAt: string | null;
  recibidoAt: string | null;
  // Estado real de la pieza una vez aceptada: status del producto + estado de la subasta donde está.
  productoStatus: string | null; // disponible | en_subasta | vendido
  subastaEstado: string | null; // programada | abierta | cerrada | finalizada
  ventaImporte: number | string | null;
  ventaComision: number | string | null;
  ventaMoneda: string | null;
  ventaStatus: string | null;
  vendidoAt: string | null;
  createdAt: string;
  images?: { url: string }[];
}

/**
 * Crea una solicitud para incluir un artículo en una futura subasta.
 * El vendedor NO fija precio: la empresa envía una propuesta completa y el vendedor decide si envía la pieza.
 * `moneda` define la moneda del cobro (según la cuenta destino validada elegida).
 */
export async function createSubmission(payload: {
  nombre?: string;
  descripcion: string;
  artista?: string;
  fechaEpoca?: string;
  datosHistoricos?: string;
  declaracionPropiedad: boolean;
  origenLicito: boolean;
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

/** El vendedor acepta la propuesta completa de la empresa → debe enviar el ítem. */
export async function acceptOffer(id: string): Promise<void> {
  await client.patch(`/submissions/${id}/accept-offer`);
}

/** El vendedor rechaza la propuesta (fin). */
export async function rejectOffer(id: string): Promise<void> {
  await client.patch(`/submissions/${id}/reject-offer`);
}

/** El vendedor confirma que envió el ítem a la empresa. */
export async function markShipped(id: string): Promise<void> {
  await client.patch(`/submissions/${id}/shipped`);
}
