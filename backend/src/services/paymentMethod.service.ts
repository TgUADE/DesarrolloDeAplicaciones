import { PaymentType, Currency } from '@prisma/client';
import { prisma } from '../config/prisma';

const USD_TYPES: PaymentType[] = ['cuenta_bancaria_extranjera', 'tarjeta_credito_internacional'];
const PAYMENT_TYPES: PaymentType[] = [
  'cuenta_bancaria_nacional',
  'cuenta_bancaria_extranjera',
  'tarjeta_credito_nacional',
  'tarjeta_credito_internacional',
  'cheque_certificado',
];
const CURRENCIES: Currency[] = ['ARS', 'USD'];

export const paymentMethodService = {
  async list(userId: string) {
    return prisma.paymentMethod.findMany({
      where: { userId, activo: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(userId: string, data: {
    tipo: PaymentType;
    moneda: Currency;
    banco?: string;
    numeroCuenta?: string;
    swift?: string;
    numeroTarjeta?: string;
    titularTarjeta?: string;
    vencimiento?: string;
    montoGarantia?: number;
  }) {
    if (!PAYMENT_TYPES.includes(data.tipo)) {
      throw { status: 400, message: 'Tipo de medio de pago inválido' };
    }
    if (!CURRENCIES.includes(data.moneda)) {
      throw { status: 400, message: 'Moneda inválida' };
    }
    if (!data.banco?.trim()) {
      throw { status: 400, message: 'Banco es obligatorio' };
    }
    if (data.tipo.startsWith('cuenta_bancaria') && !data.numeroCuenta?.trim()) {
      throw { status: 400, message: 'CBU/IBAN o número de cuenta es obligatorio' };
    }
    if (data.tipo.startsWith('tarjeta_credito')) {
      if (!data.numeroTarjeta?.trim() || !data.titularTarjeta?.trim() || !data.vencimiento?.trim()) {
        throw { status: 400, message: 'Número, titular y vencimiento de tarjeta son obligatorios' };
      }
      if (data.numeroTarjeta.trim().length !== 4) {
        throw { status: 400, message: 'Se deben informar los últimos 4 dígitos de la tarjeta' };
      }
    }
    if (data.tipo === 'cheque_certificado' && (!data.montoGarantia || Number(data.montoGarantia) <= 0)) {
      throw { status: 400, message: 'El monto de garantía del cheque es obligatorio y debe ser mayor a cero' };
    }
    // Validate USD types
    if (data.moneda === 'USD' && !USD_TYPES.includes(data.tipo) && data.tipo !== 'cheque_certificado') {
      throw { status: 400, message: 'Tipo de medio de pago no compatible con USD' };
    }
    return prisma.paymentMethod.create({ data: { ...data, userId } });
  },

  async update(id: string, userId: string, data: Partial<{
    banco: string; numeroCuenta: string; swift: string;
    numeroTarjeta: string; titularTarjeta: string; vencimiento: string; montoGarantia: number;
  }>) {
    const pm = await prisma.paymentMethod.findFirst({ where: { id, userId } });
    if (!pm) throw { status: 404, message: 'Medio de pago no encontrado' };
    return prisma.paymentMethod.update({ where: { id }, data });
  },

  async remove(id: string, userId: string) {
    const pm = await prisma.paymentMethod.findFirst({ where: { id, userId } });
    if (!pm) throw { status: 404, message: 'Medio de pago no encontrado' };
    return prisma.paymentMethod.update({ where: { id }, data: { activo: false } });
  },

  async verify(id: string, verificado: boolean) {
    const pm = await prisma.paymentMethod.findUnique({ where: { id } });
    if (!pm) throw { status: 404, message: 'Medio de pago no encontrado' };
    return prisma.paymentMethod.update({ where: { id }, data: { verificado } });
  },

  isUsdCapable(tipo: PaymentType): boolean {
    return USD_TYPES.includes(tipo);
  },
};
