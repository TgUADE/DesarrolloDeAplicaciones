const BASE = 'http://localhost:3000/api';
export const ASSET_HOST = BASE.replace(/\/api$/, '');

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
  descripcion: string;
  datosHistoricos: string | null;
  status: string;
  precioSugerido: number | string | null;
  precioBaseOfrecido: number | string | null;
  comisionesInfo: string | null;
  motivoRechazo: string | null;
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
  matricula: string;
  region: string;
}

export interface Purchase {
  identificador: number;
  status: string;
  importe: string;
  comision: string;
  moneda: string;
  costoEnvio: string | null;
  retiraPersonalmente: boolean;
  createdAt: string;
  medioPago?: { tipo: string; banco: string | null; moneda: string } | null;
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

export async function acceptSubmission(id: string, precioBaseOfrecido: number, comisionesInfo?: string): Promise<{ submission: Submission }> {
  return req(`/admin/submissions/${id}/accept`, {
    method: 'PATCH',
    body: JSON.stringify({ precioBaseOfrecido, comisionesInfo }),
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

export async function getAuctioneers(): Promise<{ auctioneers: Auctioneer[] }> {
  return req('/admin/auctioneers');
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
  descripcionCompleta?: string;
  numeroPieza?: string;
  status?: string;
  deposito?: string | null;
  seguro?: { importe: number | string } | null;
  fotos?: { url: string | null }[];
  duenio?: { persona?: { nombre: string; apellido: string } };
}

export async function getAvailableItems(): Promise<{ items: AdminProducto[] }> {
  return req('/admin/items?status=disponible');
}

// Asigna un producto disponible al catálogo de una subasta
export async function addAuctionItem(auctionId: string, productoId: number, precioBase: number, comision: number): Promise<unknown> {
  return req(`/admin/auctions/${auctionId}/items`, {
    method: 'POST',
    body: JSON.stringify({ itemId: productoId, precioBase, comision }),
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
  verificado: boolean;
  activo: boolean;
  createdAt: string;
  persona?: { id: string; nombre: string; apellido: string; email: string | null } | null;
}

export async function getPaymentMethods(verificado?: boolean): Promise<{ paymentMethods: AdminPaymentMethod[] }> {
  const qs = verificado === undefined ? '' : `?verificado=${verificado}`;
  return req(`/admin/payment-methods${qs}`);
}

export async function verifyPaymentMethod(personaId: number, pmId: string, verificado: boolean): Promise<unknown> {
  return req(`/admin/users/${personaId}/payment-methods/${pmId}/verify`, {
    method: 'PATCH',
    body: JSON.stringify({ verificado }),
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
