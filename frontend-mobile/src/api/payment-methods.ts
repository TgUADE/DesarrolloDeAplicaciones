import client from '@/api/client';

export type PaymentMethodType =
  | 'cuenta_bancaria_nacional'
  | 'cuenta_bancaria_extranjera'
  | 'tarjeta_credito_nacional'
  | 'tarjeta_credito_internacional'
  | 'cheque_certificado';

export interface PaymentMethodPayload {
  tipo: PaymentMethodType;
  moneda: 'ARS' | 'USD' | 'AMBAS';
  banco?: string;
  numeroCuenta?: string;
  swift?: string;
  numeroTarjeta?: string;
  titularTarjeta?: string;
  vencimiento?: string;
  montoGarantia?: number;
  montoDisponible?: number;
}

export async function addPaymentMethod(userId: string, payload: PaymentMethodPayload): Promise<void> {
  await client.post(`/users/${userId}/payment-methods`, payload);
}

export interface PaymentMethod {
  id: string;
  tipo: PaymentMethodType;
  moneda: 'ARS' | 'USD' | 'AMBAS';
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  verificado: boolean;
  verifiedAt?: string | null;
  updatedAt?: string | null;
  activo: boolean;
  banco?: string | null;
  numeroCuenta?: string | null;
  numeroTarjeta?: string | null;
  montoGarantia?: number | string | null;
  montoDisponible?: number | string | null;
}

/** DELETE /api/users/:id/payment-methods/:pmId → da de baja un medio de pago. */
export async function removePaymentMethod(userId: string, pmId: string): Promise<void> {
  await client.delete(`/users/${userId}/payment-methods/${pmId}`);
}

/** GET /api/users/:id/payment-methods → medios de pago del usuario. */
export async function listPaymentMethods(userId: string): Promise<PaymentMethod[]> {
  const res = await client.get(`/users/${userId}/payment-methods`);
  return res.data.data.paymentMethods as PaymentMethod[];
}
