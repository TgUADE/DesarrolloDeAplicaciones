import client from '@/api/client';

export type PaymentMethodType =
  | 'cuenta_bancaria_nacional'
  | 'cuenta_bancaria_extranjera'
  | 'tarjeta_credito_nacional'
  | 'tarjeta_credito_internacional'
  | 'cheque_certificado';

export interface PaymentMethodPayload {
  tipo: PaymentMethodType;
  moneda: 'ARS' | 'USD';
  banco?: string;
  numeroCuenta?: string;
  swift?: string;
  numeroTarjeta?: string;
  titularTarjeta?: string;
  vencimiento?: string;
  montoGarantia?: number;
}

export async function addPaymentMethod(userId: string, payload: PaymentMethodPayload): Promise<void> {
  await client.post(`/users/${userId}/payment-methods`, payload);
}

export interface PaymentMethod {
  id: string;
  tipo: PaymentMethodType;
  moneda: 'ARS' | 'USD';
  verificado: boolean;
  activo: boolean;
  banco?: string | null;
  numeroTarjeta?: string | null;
}

/** GET /api/users/:id/payment-methods → medios de pago del usuario. */
export async function listPaymentMethods(userId: string): Promise<PaymentMethod[]> {
  const res = await client.get(`/users/${userId}/payment-methods`);
  return res.data.data.paymentMethods as PaymentMethod[];
}
