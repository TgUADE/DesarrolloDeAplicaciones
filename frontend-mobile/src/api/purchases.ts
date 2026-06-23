import AsyncStorage from '@react-native-async-storage/async-storage';

import client from '@/api/client';
import { API_URL } from '@/constants/config';

export interface PurchaseProducto {
  numeroPieza?: string;
  descripcionCompleta?: string;
  deposito?: string | null;
  ubicacion?: string | null;
  seguro?: { nroPoliza: string; compania: string } | null;
  fotos?: { url: string | null }[];
}

export interface PurchaseMedioPago {
  tipo: string;
  banco?: string | null;
  moneda: string;
  numeroCuenta?: string | null;
  numeroTarjeta?: string | null;
}

export interface Purchase {
  identificador: number;
  importe: string;
  comision: string;
  moneda: string;
  status: string;
  costoEnvio: string | null;
  multa?: string | null;
  retiraPersonalmente: boolean;
  createdAt?: string;
  facturaNro?: string;
  trackingCode?: string;
  subastaTitulo?: string | null;
  medioPago?: PurchaseMedioPago | null;
  producto?: PurchaseProducto;
}

/** Compras del usuario (lo que ganó/adquirió en subastas). */
export async function listPurchases(userId: string): Promise<Purchase[]> {
  const res = await client.get(`/users/${userId}/purchases`);
  return res.data.data.purchases as Purchase[];
}

/** Detalle de una compra (resumen de compra / factura). */
export async function getPurchaseById(id: number | string): Promise<Purchase> {
  const res = await client.get(`/purchases/${id}`);
  return res.data.data as Purchase;
}

/** Retirar personalmente (pierde la cobertura del seguro). */
export async function retirePurchase(id: number): Promise<void> {
  await client.patch(`/purchases/${id}/retire`);
}

/** Envía la factura por mail al comprador. */
export async function sendInvoiceByMail(id: number | string): Promise<{ sent: boolean; to: string }> {
  const res = await client.post(`/purchases/${id}/send-invoice`);
  return res.data.data as { sent: boolean; to: string };
}

/**
 * URL de la factura imprimible (HTML → el navegador puede guardarla como PDF).
 * Incluye el token por query para poder abrirse fuera de la app.
 */
export async function invoiceUrl(id: number | string): Promise<string> {
  const token = (await AsyncStorage.getItem('accessToken')) ?? '';
  return `${API_URL}/purchases/${id}/invoice?token=${encodeURIComponent(token)}`;
}
