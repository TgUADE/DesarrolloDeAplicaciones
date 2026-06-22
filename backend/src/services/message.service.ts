import { prisma } from '../config/prisma';

export const messageService = {
  async create(personaId: number, asunto: string, cuerpo: string, tipo: string) {
    return prisma.mensaje.create({ data: { personaId, asunto, cuerpo, tipo } });
  },

  async list(personaId: number, leido?: boolean, skip = 0, take = 20) {
    const where = leido !== undefined ? { personaId, leido } : { personaId };
    const [messages, total] = await Promise.all([
      prisma.mensaje.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.mensaje.count({ where }),
    ]);
    return { messages, total };
  },

  async markRead(id: string, personaId: number) {
    return prisma.mensaje.updateMany({ where: { id, personaId }, data: { leido: true } });
  },

  async sendPurchaseMessage(
    clienteId: number,
    itemDesc: string,
    monto: number,
    comisiones: number,
    costoEnvio: number | null,
    moneda: string,
  ) {
    const total = monto + comisiones + (costoEnvio ?? 0);
    await this.create(
      clienteId,
      '¡Ganaste la subasta!',
      `Felicitaciones, ganaste "${itemDesc}".

Detalle de pago:
- Oferta ganadora: ${moneda} ${monto}
- Comisiones: ${moneda} ${comisiones}
- Costo de envío: ${costoEnvio ? `${moneda} ${costoEnvio}` : 'Retiro personal'}
- TOTAL A PAGAR: ${moneda} ${total}`,
      'resultado',
    );
  },
};
