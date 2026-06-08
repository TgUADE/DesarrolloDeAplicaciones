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
