import { prisma } from '../config/prisma';

export const messageService = {
  async create(userId: string, asunto: string, cuerpo: string, tipo: string) {
    return prisma.mensaje.create({ data: { userId, asunto, cuerpo, tipo } });
  },

  async list(userId: string, leido?: boolean, skip = 0, take = 20) {
    const where = leido !== undefined ? { userId, leido } : { userId };
    const [messages, total] = await Promise.all([
      prisma.mensaje.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.mensaje.count({ where }),
    ]);
    return { messages, total };
  },

  async markRead(id: string, userId: string) {
    return prisma.mensaje.updateMany({
      where: { id, userId },
      data: { leido: true },
    });
  },

  async sendPurchaseMessage(userId: string, itemDesc: string, monto: number, comisiones: number, costoEnvio: number | null, moneda: string) {
    const total = monto + comisiones + (costoEnvio ?? 0);
    await this.create(
      userId,
      '¡Ganaste la subasta!',
      `Felicitaciones, ganaste "${itemDesc}".

Detalle de pago:
- Oferta ganadora: ${moneda} ${monto}
- Comisiones: ${moneda} ${comisiones}
- Costo de envío: ${costoEnvio ? `${moneda} ${costoEnvio}` : 'Retiro personal'}
- TOTAL A PAGAR: ${moneda} ${total}`,
      'resultado'
    );
  },
};
