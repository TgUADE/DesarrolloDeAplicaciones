import { prisma } from '../config/prisma';
import { getPagination } from '../utils/pagination';
import { Request } from 'express';

export const userService = {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true, nombre: true, apellido: true, email: true,
        domicilioLegal: true, paisOrigen: true, categoria: true,
        status: true, isAdmin: true, cuentaCobro: true,
        createdAt: true, updatedAt: true,
      },
    });
  },

  async update(id: string, data: { domicilioLegal?: string; cuentaCobro?: string }) {
    return prisma.user.update({ where: { id }, data });
  },

  async getMetrics(userId: string) {
    const [participaciones, victorias, bids] = await Promise.all([
      prisma.auctionParticipant.count({ where: { userId } }),
      prisma.purchase.count({ where: { buyerId: userId, status: 'pagado' } }),
      prisma.puja.findMany({
        where: { userId, confirmada: true },
        select: { monto: true, moneda: true },
      }),
    ]);

    const purchases = await prisma.purchase.findMany({
      where: { buyerId: userId },
      select: { montoGanador: true, comisiones: true, moneda: true },
    });

    const totalPagadoARS = purchases
      .filter(p => p.moneda === 'ARS')
      .reduce((sum, p) => sum + Number(p.montoGanador) + Number(p.comisiones), 0);

    const totalPagadoUSD = purchases
      .filter(p => p.moneda === 'USD')
      .reduce((sum, p) => sum + Number(p.montoGanador) + Number(p.comisiones), 0);

    const totalOfertadoARS = bids
      .filter(b => b.moneda === 'ARS')
      .reduce((sum, b) => sum + Number(b.monto), 0);

    const totalOfertadoUSD = bids
      .filter(b => b.moneda === 'USD')
      .reduce((sum, b) => sum + Number(b.monto), 0);

    return {
      totalParticipaciones: participaciones,
      totalVictorias: victorias,
      totalPagadoARS,
      totalPagadoUSD,
      totalOfertadoARS,
      totalOfertadoUSD,
    };
  },

  async getAuctionHistory(userId: string, req: Request) {
    const { skip, take, page } = getPagination(req) as any;
    const [auctions, total] = await Promise.all([
      prisma.auctionParticipant.findMany({
        where: { userId },
        skip,
        take,
        include: {
          auction: {
            include: {
              rematador: true,
              items: {
                take: 1,
                orderBy: { ordenEnSubasta: 'asc' },
                select: { id: true, images: { take: 1, orderBy: { orden: 'asc' }, select: { url: true } } },
              },
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      }),
      prisma.auctionParticipant.count({ where: { userId } }),
    ]);
    return { auctions: auctions.map(p => p.auction), total, page };
  },

  async getPurchases(userId: string, req: Request) {
    const { skip, limit, page } = getPagination(req);
    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where: { buyerId: userId },
        skip,
        take: limit,
        include: { item: { include: { images: { take: 1 } } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.purchase.count({ where: { buyerId: userId } }),
    ]);
    return { purchases, total, page };
  },
};
