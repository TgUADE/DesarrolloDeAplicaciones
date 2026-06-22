import client from '@/api/client';

export interface PurchaseProducto {
  numeroPieza?: string;
  descripcionCompleta?: string;
  deposito?: string | null;
  ubicacion?: string | null;
  seguro?: { nroPoliza: string; compania: string } | null;
  images?: { url: string | null }[];
}

export interface Purchase {
  identificador: number;
  importe: string;
  comision: string;
  moneda: string;
  status: string;
  costoEnvio: string | null;
  retiraPersonalmente: boolean;
  producto?: PurchaseProducto;
}

/** Compras del usuario (lo que ganó/adquirió en subastas). */
export async function listPurchases(userId: string): Promise<Purchase[]> {
  const res = await client.get(`/users/${userId}/purchases`);
  return res.data.data.purchases as Purchase[];
}

/** Retirar personalmente (pierde la cobertura del seguro). */
export async function retirePurchase(id: number): Promise<void> {
  await client.patch(`/purchases/${id}/retire`);
}
