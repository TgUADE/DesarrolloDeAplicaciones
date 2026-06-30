// Host del backend: en producción se inyecta VITE_API_URL en el build (ver Dockerfile);
// si no está definida, cae al backend local para desarrollo.
const API_HOST = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
const BASE = `${API_HOST}/api`;
export const ASSET_HOST = API_HOST;

/** Resuelve la URL de una imagen (absoluta o relativa a /uploads del backend). */
export function imageUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  return u.startsWith('http') ? u : `${ASSET_HOST}${u}`;
}

export interface AdminUser {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  isAdmin: boolean;
  status: string;
}

export interface PUser {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  categoria: string | null;
  status: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  personaId: number;
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
  createdAt: string;
  persona?: { nombre: string; apellido: string; email?: string | null };
  images?: { url: string }[];
  _count?: { images: number };
}

export interface Auction {
  id: string;
  titulo: string;
  descripcion: string;
  fechaHora: string;
  status: string; // estado: programada | abierta | cerrada | finalizada
  categoria: string;
  ubicacion: string;
  moneda?: string;
  currentItemId: number | null;
}

export interface AdminCatalog {
  id: string;
  identificador: number;
  descripcion: string;
  subastaId: number | null;
  subastaTitulo: string | null;
  status: string;
  itemCount: number;
  moneda: string | null;
}

export interface AuctionItem {
  identificador: number;
  productoId: number;
  numeroPieza?: string;
  precioBase?: number | string;
  comision?: number | string;
  status: string; // en_subasta | vendido | sin_venta
  ordenEnSubasta: number;
  producto?: { descripcionCompleta: string; fotos?: { url: string | null }[] };
}

export interface Auctioneer {
  id: string;
  nombre: string;
  apellido: string;
  email?: string | null;
  matricula: string | null;
  region: string | null;
  activo?: boolean;
}

export interface Purchase {
  identificador: number;
  status: string;
  importe: string;
  comision: string;
  moneda: string;
  costoEnvio: string | null;
  multa?: string | null;
  retiraPersonalmente: boolean;
  envioEstado?: string; // pendiente | enviado | recibido
  createdAt: string;
  medioPago?: { tipo: string; banco: string | null; moneda: string; montoDisponible?: number | string | null } | null;
  cliente?: { persona?: { nombre: string; apellido: string; email?: string | null } };
  producto?: { descripcionCatalogo?: string | null; numeroPieza?: string | null; deposito?: string | null };
}

// Token management
let _token: string | null = localStorage.getItem('adminToken');

export function setToken(t: string) {
  _token = t;
  localStorage.setItem('adminToken', t);
}

export function clearToken() {
  _token = null;
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
}

export function getStoredUser(): AdminUser | null {
  const raw = localStorage.getItem('adminUser');
  return raw ? (JSON.parse(raw) as AdminUser) : null;
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
      ...(opts.headers ?? {}),
    },
    credentials: 'include',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any).message || (json as any).error || `HTTP ${res.status}`);
  return (json as any).data as T;
}

// Auth
export async function login(email: string, password: string): Promise<AdminUser> {
  const data = await req<{ accessToken: string; user: AdminUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.accessToken);
  localStorage.setItem('adminUser', JSON.stringify(data.user));
  return data.user;
}

// Users
export async function getUsers(status?: string): Promise<{ users: PUser[]; total: number }> {
  const p = new URLSearchParams({ limit: '100' });
  if (status) p.set('status', status);
  return req(`/admin/users?${p}`);
}

export interface ApproveResult {
  user: PUser;
  completionToken?: string;
  completionUrl?: string;
}

export async function approveUser(id: string, categoria: string): Promise<ApproveResult> {
  return req(`/admin/users/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ categoria }),
  });
}

export async function setUserStatus(id: string, status: string): Promise<PUser> {
  return req(`/admin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function setUserCategory(id: string, categoria: string): Promise<unknown> {
  return req(`/admin/users/${id}/category`, {
    method: 'PATCH',
    body: JSON.stringify({ categoria }),
  });
}

// Submissions
export async function getSubmissions(status?: string): Promise<{ submissions: Submission[] }> {
  const p = new URLSearchParams({ limit: '100' });
  if (status) p.set('status', status);
  return req(`/admin/submissions?${p}`);
}

// La empresa responde con propuesta completa → el vendedor acepta y envía el bien, o rechaza.
export async function offerSubmission(
  id: string,
  precioBaseOfrecido: number,
  comisionPorcentaje: number,
  fechaSubastaEstimada: string,
  comisionesInfo?: string,
  direccionEnvio?: string,
): Promise<{ submission: Submission }> {
  return req(`/admin/submissions/${id}/offer`, {
    method: 'PATCH',
    body: JSON.stringify({ precioBaseOfrecido, comisionPorcentaje, fechaSubastaEstimada, comisionesInfo, direccionEnvio }),
  });
}

// La empresa marca el ítem como recibido en el depósito.
export async function markSubmissionReceived(id: string, deposito?: string, ubicacion?: string): Promise<{ submission: Submission }> {
  return req(`/admin/submissions/${id}/received`, {
    method: 'PATCH',
    body: JSON.stringify({ deposito, ubicacion }),
  });
}

export async function rejectSubmission(id: string, motivoRechazo: string): Promise<{ submission: Submission }> {
  return req(`/admin/submissions/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ motivoRechazo }),
  });
}

// Auctions
export async function getAuctions(): Promise<{ auctions: Auction[] }> {
  return req('/auctions?limit=50');
}

export async function getAuctioneers(all = false): Promise<{ auctioneers: Auctioneer[] }> {
  return req(`/admin/auctioneers${all ? '?all=1' : ''}`);
}

export async function createAuctioneer(data: { nombre: string; apellido: string; email?: string; matricula: string; region: string }): Promise<unknown> {
  return req('/admin/auctioneers', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAuctioneer(
  id: string,
  data: Partial<{ nombre: string; apellido: string; matricula: string; region: string; activo: boolean }>,
): Promise<unknown> {
  return req(`/admin/auctioneers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function createAuction(data: {
  titulo: string;
  descripcion: string;
  fechaHora: string;
  ubicacion: string;
  categoria: string;
  moneda: string;
  rematadorId: string;
}): Promise<Auction> {
  return req('/admin/auctions', { method: 'POST', body: JSON.stringify(data) });
}

// Abrir subasta (estado → abierta)
export async function startAuction(id: string): Promise<Auction> {
  return req(`/admin/auctions/${id}/start`, { method: 'POST' });
}

// Cambiar estado de la subasta (ej: cerrada)
export async function setAuctionStatus(id: string, status: string): Promise<Auction> {
  return req(`/admin/auctions/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// Ver los ítems del catálogo de una subasta
export async function getAuctionItems(id: string): Promise<{ items: AuctionItem[] }> {
  return req(`/auctions/${id}/catalog`);
}

// Iniciar el remate de un ítem (arranca el cronómetro de pujas)
export async function startItem(auctionId: string, itemId: number): Promise<unknown> {
  return req(`/auctions/${auctionId}/items/${itemId}/start`, { method: 'POST' });
}

// Cerrar el ítem en remate (adjudica al mejor postor)
export async function closeAuctionItem(auctionId: string, itemId: number): Promise<unknown> {
  return req(`/admin/auctions/${auctionId}/items/${itemId}/close`, { method: 'PATCH' });
}

// Productos disponibles (aceptados, sin asignar a una subasta) para sumar a un catálogo
export interface AdminProducto {
  identificador: number;
  duenioId?: number;
  descripcionCompleta?: string;
  numeroPieza?: string;
  status?: string;
  moneda?: string;
  deposito?: string | null;
  seguro?: { importe: number | string } | null;
  fotos?: { url: string | null }[];
  duenio?: { persona?: { nombre: string; apellido: string } };
}

/** Productos disponibles para asignar. Si se pasa `moneda`, solo los de esa moneda. */
export async function getAvailableItems(moneda?: string): Promise<{ items: AdminProducto[] }> {
  return req(`/admin/items?status=disponible${moneda ? `&moneda=${encodeURIComponent(moneda)}` : ''}`);
}

// Asigna un producto disponible al catálogo de una subasta
export async function addAuctionItem(auctionId: string, productoId: number, precioBase: number, comision: number): Promise<unknown> {
  return req(`/admin/auctions/${auctionId}/items`, {
    method: 'POST',
    body: JSON.stringify({ itemId: productoId, precioBase, comision }),
  });
}

// Catalogs
export async function getCatalogs(status?: string): Promise<{ catalogs: AdminCatalog[] }> {
  const qs = status ? "?" + new URLSearchParams({ status }).toString() : "";
  return req("/admin/catalogs" + qs);
}

export async function createCatalog(data: { descripcion: string }): Promise<AdminCatalog> {
  return req("/admin/catalogs", { method: "POST", body: JSON.stringify(data) });
}

export async function getCatalogItems(id: string): Promise<{ items: AuctionItem[] }> {
  return req("/admin/catalogs/" + id + "/items");
}

export async function addCatalogItem(catalogId: string, productoId: number, precioBase: number, comision: number): Promise<unknown> {
  return req("/admin/catalogs/" + catalogId + "/items", {
    method: "POST",
    body: JSON.stringify({ itemId: productoId, precioBase, comision }),
  });
}

export async function assignCatalogToAuction(catalogId: string, auctionId: string): Promise<AdminCatalog> {
  return req("/admin/catalogs/" + catalogId + "/auction", {
    method: "PATCH",
    body: JSON.stringify({ subastaId: Number(auctionId) }),
  });
}

// Payment methods
export interface AdminPaymentMethod {
  id: string;
  personaId: number;
  tipo: string;
  moneda: string;
  banco?: string | null;
  numeroCuenta?: string | null;
  numeroTarjeta?: string | null;
  titularTarjeta?: string | null;
  montoGarantia?: number | null;
  montoDisponible?: number | string | null;
  estado: string; // pendiente | aprobada | rechazada
  verificado: boolean;
  verifiedAt?: string | null;
  updatedAt?: string | null;
  activo: boolean;
  createdAt: string;
  persona?: { id: string; nombre: string; apellido: string; email: string | null } | null;
}

export async function getPaymentMethods(estado?: string): Promise<{ paymentMethods: AdminPaymentMethod[] }> {
  const qs = estado ? `?estado=${estado}` : '';
  return req(`/admin/payment-methods${qs}`);
}

export async function verifyPaymentMethod(personaId: number, pmId: string, estado: 'aprobada' | 'rechazada' | 'pendiente'): Promise<unknown> {
  return req(`/admin/users/${personaId}/payment-methods/${pmId}/verify`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  });
}

// --- Solicitudes de cambio de datos de perfil ---
export interface ProfileChangeRequest {
  id: string;
  nombre: string | null;
  apellido: string | null;
  domicilioLegal: string | null;
  cuentaCobro: string | null;
  estado: string; // pendiente | aprobada | rechazada
  motivoRechazo: string | null;
  createdAt: string;
  persona?: { id: string; nombre: string; apellido: string; email: string | null } | null;
  actual?: { nombre: string; apellido: string; domicilioLegal: string | null; cuentaCobro: string | null } | null;
}

export async function getProfileChangeRequests(estado?: string): Promise<{ requests: ProfileChangeRequest[] }> {
  const qs = estado ? `?estado=${estado}` : '';
  return req(`/admin/profile-change-requests${qs}`);
}

export async function approveProfileChangeRequest(id: string): Promise<unknown> {
  return req(`/admin/profile-change-requests/${id}/approve`, { method: 'PATCH' });
}

export async function rejectProfileChangeRequest(id: string, motivoRechazo: string): Promise<unknown> {
  return req(`/admin/profile-change-requests/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ motivoRechazo }),
  });
}

// Ubicación / depósito y seguro de un producto (por productoId)
export async function setItemLocation(productoId: number, deposito: string, ubicacion: string): Promise<unknown> {
  return req(`/admin/items/${productoId}/location`, { method: 'PATCH', body: JSON.stringify({ deposito, ubicacion }) });
}

export async function setItemInsurance(
  productoId: number,
  data: { nroPoliza: string; compania: string; importe: number; polizaCombinada?: boolean },
): Promise<unknown> {
  return req(`/admin/items/${productoId}/insurance`, { method: 'PATCH', body: JSON.stringify(data) });
}

// Dueños (verificación financiera/judicial + calificación de riesgo)
export interface AdminDuenio {
  id: string;
  nombre: string;
  apellido: string;
  email: string | null;
  verificacionFinanciera: boolean;
  verificacionJudicial: boolean;
  calificacionRiesgo: number | null;
}

export async function getDuenios(): Promise<{ duenios: AdminDuenio[] }> {
  return req('/admin/duenios');
}

export async function verifyDuenio(
  id: string,
  data: { verificacionFinanciera?: boolean; verificacionJudicial?: boolean; calificacionRiesgo?: number },
): Promise<unknown> {
  return req(`/admin/duenios/${id}/verify`, { method: 'PATCH', body: JSON.stringify(data) });
}

// Purchases
export async function getPurchases(status?: string): Promise<{ purchases: Purchase[] }> {
  const p = new URLSearchParams({ limit: '100' });
  if (status) p.set('status', status);
  return req(`/admin/purchases?${p}`);
}

export async function markPurchasePaid(id: number): Promise<Purchase> {
  return req(`/admin/purchases/${id}/paid`, { method: 'PATCH' });
}

export async function applyFine(id: number): Promise<Purchase> {
  return req(`/admin/purchases/${id}/fine`, { method: 'PATCH' });
}

// Seguros (pólizas)
export interface SeguroProducto {
  identificador: number;
  duenioId: number;
  descripcionCompleta: string;
  numeroPieza: string | null;
  status: string | null;
  moneda: string | null;
  duenio: { nombre: string; apellido: string } | null;
}

export interface AdminSeguro {
  nroPoliza: string;
  compania: string;
  importe: number;
  polizaCombinada: boolean;
  duenioId: number | null;
  duenio: { id: number; nombre: string; apellido: string } | null;
  productos: SeguroProducto[];
}

export async function getSeguros(): Promise<{ seguros: AdminSeguro[] }> {
  return req('/admin/seguros');
}

export async function createSeguro(data: { nroPoliza: string; compania: string; importe: number; polizaCombinada?: boolean }): Promise<AdminSeguro> {
  return req('/admin/seguros', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateSeguro(nroPoliza: string, data: { compania?: string; importe?: number; polizaCombinada?: boolean }): Promise<AdminSeguro> {
  return req(`/admin/seguros/${encodeURIComponent(nroPoliza)}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteSeguro(nroPoliza: string): Promise<unknown> {
  return req(`/admin/seguros/${encodeURIComponent(nroPoliza)}`, { method: 'DELETE' });
}

export async function assignProductToPolicy(nroPoliza: string, productoId: number): Promise<unknown> {
  return req(`/admin/seguros/${encodeURIComponent(nroPoliza)}/productos/${productoId}`, { method: 'PATCH' });
}

export async function unassignProductFromPolicy(nroPoliza: string, productoId: number): Promise<unknown> {
  return req(`/admin/seguros/${encodeURIComponent(nroPoliza)}/productos/${productoId}`, { method: 'DELETE' });
}

export async function getAllItems(): Promise<{ items: AdminProducto[] }> {
  return req('/admin/items');
}

// Solicitudes de aumento del valor asegurado (las inician los dueños desde la app)
export interface SeguroAumento {
  id: string;
  nroPoliza: string;
  valorActual: number;
  valorSolicitado: number;
  diferenciaPremio: number;
  estado: string; // pendiente | aprobada | rechazada
  motivoRechazo: string | null;
  createdAt: string;
  resueltaAt: string | null;
  duenio: { nombre: string; apellido: string } | null;
}

export async function getSeguroRequests(estado?: string): Promise<{ solicitudes: SeguroAumento[] }> {
  const qs = estado ? `?estado=${encodeURIComponent(estado)}` : '';
  return req(`/admin/seguros/aumentos${qs}`);
}

export async function approveSeguroRequest(id: string): Promise<unknown> {
  return req(`/admin/seguros/aumentos/${id}/approve`, { method: 'PATCH' });
}

export async function rejectSeguroRequest(id: string, motivoRechazo?: string): Promise<unknown> {
  return req(`/admin/seguros/aumentos/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ motivoRechazo }) });
}

// Workflow de envío de la compra (luego del pago).
export async function markPurchaseShipped(id: number): Promise<Purchase> {
  return req(`/admin/purchases/${id}/shipped`, { method: 'PATCH' });
}

export async function markPurchaseDelivered(id: number): Promise<Purchase> {
  return req(`/admin/purchases/${id}/delivered`, { method: 'PATCH' });
}
