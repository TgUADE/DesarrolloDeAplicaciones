import { prisma } from '../config/prisma';
import { emailService } from './email.service';
import { messageService } from './message.service';
import { categoryService } from './category.service';

export const purchaseService = {
  async findById(id: string) {
    return prisma.purchase.findUnique({
      where: { id },
      include: {
        item: { include: { images: { take: 1 } } },
        buyer: { select: { id: true, nombre: true, apellido: true, email: true } },
      },
    });
  },

  async applyFine(id: string) {
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: { buyer: true },
    });
    if (!purchase) throw { status: 404, message: 'Compra no encontrada' };
    if (purchase.status !== 'pendiente_pago') throw { status: 400, message: 'Estado inválido para aplicar multa' };

    const multa = Number(purchase.montoGanador) * 0.1;
    const pagoVencimientoAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const updated = await prisma.purchase.update({
      where: { id },
      data: { status: 'multa_aplicada', multa, multaAplicadaAt: new Date(), pagoVencimientoAt },
    });

    await messageService.create(
      purchase.buyerId,
      'Multa aplicada a tu compra',
      `Se aplicó una multa del 10% (${purchase.moneda} ${multa}) por no cumplir el pago. Tenés 72 horas para presentar los fondos.`,
      'multa'
    );

    if (purchase.buyer.email) {
      await emailService.sendFineNotification(purchase.buyer.email, multa, purchase.moneda);
    }

    return updated;
  },

  async markRetired(id: string, userId: string) {
    const purchase = await prisma.purchase.findFirst({ where: { id, buyerId: userId } });
    if (!purchase) throw { status: 404, message: 'Compra no encontrada' };
    return prisma.purchase.update({ where: { id }, data: { retiraPersonalmente: true } });
  },

  async listAll(status?: string, skip = 0, take = 20) {
    const where = status ? { status: status as any } : {};
    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where, skip, take,
        include: {
          item: { select: { id: true, descripcion: true, numeroPieza: true } },
          buyer: { select: { id: true, nombre: true, apellido: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.purchase.count({ where }),
    ]);
    return { purchases, total };
  },

  async checkExpiredFines() {
    const expired = await prisma.purchase.findMany({
      where: {
        status: 'multa_aplicada',
        pagoVencimientoAt: { lt: new Date() },
      },
      include: { buyer: true },
    });

    for (const purchase of expired) {
      await prisma.$transaction([
        prisma.purchase.update({ where: { id: purchase.id }, data: { status: 'derivado_justicia' } }),
        prisma.user.update({ where: { id: purchase.buyerId }, data: { status: 'bloqueado' } }),
      ]);

      await messageService.create(
        purchase.buyerId,
        'Tu caso fue derivado a la justicia',
        'No cumpliste con el pago en el plazo estipulado. Tu cuenta ha sido bloqueada y el caso fue derivado a la justicia.',
        'multa'
      );
    }

    return expired.length;
  },

  async markPaid(id: string) {
    const purchase = await prisma.purchase.findUnique({ where: { id } });
    if (!purchase) throw { status: 404, message: 'Compra no encontrada' };
    const updated = await prisma.purchase.update({ where: { id }, data: { status: 'pagado' } });
    await categoryService.evaluateUpgrade(purchase.buyerId);
    return updated;
  },
};
