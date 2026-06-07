import { PaymentType, Currency } from '@prisma/client';
import { prisma } from '../config/prisma';

const USD_TYPES: PaymentType[] = ['cuenta_bancaria_extranjera', 'tarjeta_credito_internacional'];

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
