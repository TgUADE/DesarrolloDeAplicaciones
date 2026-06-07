import { AuctionCategory, AuctionStatus, Currency } from '@prisma/client';
import { prisma } from '../config/prisma';
import { categoryService } from './category.service';
import { validateBidAmount } from '../utils/bidLimits';
import { paymentMethodService } from './paymentMethod.service';
import { messageService } from './message.service';
import { getPagination } from '../utils/pagination';
import { Request } from 'express';

export const auctionService = {
  async list(req: Request, filters: { status?: AuctionStatus; categoria?: AuctionCategory; moneda?: Currency }) {
    const { skip, limit, page } = getPagination(req);
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.categoria) where.categoria = filters.categoria;
    if (filters.moneda) where.moneda = filters.moneda;

    const [auctions, total] = await Promise.all([
      prisma.auction.findMany({
        where,
        skip,
        take: limit,
        include: { rematador: true, _count: { select: { items: true, participants: true } } },
        orderBy: { fechaHora: 'asc' },
      }),
      prisma.auction.count({ where }),
    ]);
    return { auctions, total, page };
  },

  async findById(id: string) {
    return prisma.auction.findUnique({
      where: { id },
      include: { rematador: true, _count: { select: { items: true, participants: true } } },
    });
  },

  async getCatalog(id: string, showPrices: boolean) {
    const items = await prisma.item.findMany({
      where: { auctionId: id },
      include: {
        images: { take: 1, orderBy: { orden: 'asc' } },
        currentOwner: { select: { id: true, nombre: true, apellido: true } },
      },
      orderBy: { ordenEnSubasta: 'asc' },
    });

    if (!showPrices) {
      return items.map(({ precioBase: _, ...item }) => item);
    }
    return items;
  },

  async getCurrentItem(auctionId: string) {
    const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction?.currentItemId) return null;

    const item = await prisma.item.findUnique({
      where: { id: auction.currentItemId },
      include: { images: { orderBy: { orden: 'asc' } } },
    });

    const lastBid = await prisma.puja.findFirst({
      where: { itemId: auction.currentItemId, confirmada: true },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, nombre: true, apellido: true } } },
    });

    return { item, mejorOferta: lastBid?.monto ?? null, mejorPostor: lastBid?.user ?? null };
  },

  async getBids(auctionId: string, req: Request) {
    const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction?.currentItemId) return { bids: [], total: 0 };
    const { skip, limit, page } = getPagination(req);
    const [bids, total] = await Promise.all([
      prisma.puja.findMany({
        where: { itemId: auction.currentItemId, confirmada: true },
        skip, take: limit,
        include: { user: { select: { id: true, nombre: true, apellido: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.puja.count({ where: { itemId: auction.currentItemId, confirmada: true } }),
    ]);
    return { bids, total, page };
  },

  async join(auctionId: string, userId: string) {
    const [auction, user] = await Promise.all([
      prisma.auction.findUnique({ where: { id: auctionId } }),
      prisma.user.findUnique({
        where: { id: userId },
        include: { paymentMethods: { where: { verificado: true, activo: true } } },
      }),
    ]);

    if (!auction) throw { status: 404, message: 'Subasta no encontrada' };
    if (auction.status !== 'abierta') throw { status: 400, message: 'La subasta no está abierta' };
    if (!user) throw { status: 404, message: 'Usuario no encontrado' };
    if (user.status !== 'aprobado') throw { status: 403, message: 'Tu cuenta no está aprobada' };

    if (!categoryService.canAccessAuction(user.categoria, auction.categoria as AuctionCategory)) {
      throw { status: 403, message: 'Tu categoría no permite acceder a esta subasta' };
    }

    // Check already in another auction
    const activeParticipation = await prisma.auctionParticipant.findFirst({
      where: { userId, isActive: true, auctionId: { not: auctionId } },
    });
    if (activeParticipation) {
      throw { status: 409, message: 'Ya estás conectado a otra subasta' };
    }

    await prisma.auctionParticipant.upsert({
      where: { auctionId_userId: { auctionId, userId } },
      create: { auctionId, userId, isActive: true },
      update: { isActive: true, joinedAt: new Date(), leftAt: null },
    });

    return { canBid: user.paymentMethods.length > 0 };
  },

  async leave(auctionId: string, userId: string) {
    await prisma.auctionParticipant.updateMany({
      where: { auctionId, userId },
      data: { isActive: false, leftAt: new Date() },
    });
  },

  async placeBid(auctionId: string, userId: string, paymentMethodId: string, monto: number) {
    return await prisma.$transaction(async (tx) => {
      // Advisory lock per item to prevent concurrent bids
      const auction = await tx.auction.findUnique({ where: { id: auctionId } });
      if (!auction || !auction.currentItemId) throw { status: 400, message: 'No hay ítem activo en esta subasta' };
      if (auction.status !== 'abierta') throw { status: 400, message: 'La subasta no está abierta' };

      // Lock on item
      await tx.$queryRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, auction.currentItemId);

      const [user, participant, item] = await Promise.all([
        tx.user.findUnique({
          where: { id: userId },
          include: { paymentMethods: { where: { id: paymentMethodId, verificado: true, activo: true } } },
        }),
        tx.auctionParticipant.findFirst({ where: { auctionId, userId, isActive: true } }),
        tx.item.findUnique({ where: { id: auction.currentItemId } }),
      ]);

      if (!user || user.status !== 'aprobado') throw { status: 403, message: 'Usuario no autorizado' };
      if (!participant) throw { status: 403, message: 'No estás conectado a esta subasta' };
      if (!item) throw { status: 404, message: 'Ítem no encontrado' };

      const pm = user.paymentMethods[0];
      if (!pm) throw { status: 403, message: 'Medio de pago no encontrado o no verificado' };

      // Currency check
      if (auction.moneda === 'USD' && !paymentMethodService.isUsdCapable(pm.tipo)) {
        throw { status: 400, message: 'Esta subasta es en USD, usá un medio de pago internacional' };
      }

      // Cheque guarantee check
      if (pm.tipo === 'cheque_certificado' && pm.montoGarantia) {
        const pendingPurchases = await tx.purchase.aggregate({
          where: { buyerId: userId, status: { in: ['pendiente_pago', 'multa_aplicada'] } },
          _sum: { montoGanador: true },
        });
        const usedAmount = Number(pendingPurchases._sum.montoGanador ?? 0);
        if (usedAmount + monto > Number(pm.montoGarantia)) {
          throw { status: 400, message: 'El monto supera tu garantía de cheque certificado' };
        }
      }

      // No pending unconfirmed bid
      const pendingBid = await tx.puja.findFirst({
        where: { itemId: auction.currentItemId, userId, confirmada: false },
      });
      if (pendingBid) throw { status: 409, message: 'Ya tenés una puja pendiente de confirmación' };

      // Get last confirmed bid
      const lastBid = await tx.puja.findFirst({
        where: { itemId: auction.currentItemId, confirmada: true },
        orderBy: { createdAt: 'desc' },
      });
      const ultimaOferta = Number(lastBid?.monto ?? item.precioBase);

      const validation = validateBidAmount(monto, Number(item.precioBase), ultimaOferta, auction.categoria as AuctionCategory);
      if (!validation.valid) throw { status: 422, message: validation.error };

      const puja = await tx.puja.create({
        data: {
          auctionId,
          itemId: auction.currentItemId,
          userId,
          monto,
          moneda: auction.moneda,
          confirmada: false,
        },
      });

      // Confirm immediately (system confirmation)
      const confirmed = await tx.puja.update({
        where: { id: puja.id },
        data: { confirmada: true },
      });

      return { puja: confirmed, mejorOferta: monto };
    });
  },

  async closeItem(auctionId: string) {
    return await prisma.$transaction(async (tx) => {
      const auction = await tx.auction.findUnique({ where: { id: auctionId } });
      if (!auction?.currentItemId) throw { status: 400, message: 'No hay ítem activo' };

      const lastBid = await tx.puja.findFirst({
        where: { itemId: auction.currentItemId, confirmada: true },
        orderBy: { createdAt: 'desc' },
      });

      const item = await tx.item.findUnique({ where: { id: auction.currentItemId } });
      if (!item) throw { status: 404, message: 'Ítem no encontrado' };

      let purchase = null;
      if (lastBid) {
        // Winner!
        await tx.item.update({
          where: { id: auction.currentItemId },
          data: { status: 'vendido', currentOwnerId: lastBid.userId },
        });

        const COMMISSION_RATE = 0.05;
        const comisiones = Number(lastBid.monto) * COMMISSION_RATE;

        purchase = await tx.purchase.create({
          data: {
            itemId: auction.currentItemId,
            buyerId: lastBid.userId,
            montoGanador: lastBid.monto,
            moneda: lastBid.moneda,
            comisiones,
          },
        });

        await messageService.sendPurchaseMessage(
          lastBid.userId,
          item.descripcion,
          Number(lastBid.monto),
          comisiones,
          null,
          auction.moneda
        );
      } else {
        // Company buys at base price
        await tx.item.update({
          where: { id: auction.currentItemId },
          data: { status: 'vendido' },
        });
      }

      // Find next item
      const nextItem = await tx.item.findFirst({
        where: {
          auctionId,
          status: 'en_subasta',
          id: { not: auction.currentItemId },
          ordenEnSubasta: { gt: item.ordenEnSubasta ?? 0 },
        },
        orderBy: { ordenEnSubasta: 'asc' },
      });

      await tx.auction.update({
        where: { id: auctionId },
        data: { currentItemId: nextItem?.id ?? null },
      });

      return { purchase, nextItem, closedItemId: auction.currentItemId };
    });
  },

  async addItem(auctionId: string, itemId: string) {
    const [auction, item] = await Promise.all([
      prisma.auction.findUnique({ where: { id: auctionId } }),
      prisma.item.findUnique({ where: { id: itemId } }),
    ]);
    if (!auction) throw { status: 404, message: 'Subasta no encontrada' };
    if (!item) throw { status: 404, message: 'Ítem no encontrado' };
    if (item.status !== 'disponible') throw { status: 400, message: 'El ítem no está disponible' };

    const count = await prisma.item.count({ where: { auctionId } });

    return prisma.item.update({
      where: { id: itemId },
      data: { auctionId, status: 'en_subasta', ordenEnSubasta: count + 1 },
    });
  },

  async getParticipants(auctionId: string) {
    return prisma.auctionParticipant.findMany({
      where: { auctionId, isActive: true },
      include: { user: { select: { id: true, nombre: true, apellido: true, categoria: true } } },
    });
  },

  async create(data: {
    titulo: string;
    descripcion?: string;
    fechaHora: Date;
    ubicacion: string;
    categoria: AuctionCategory;
    moneda: Currency;
    rematadorId: string;
    esColeccion?: boolean;
    nombreColeccion?: string;
  }) {
    return prisma.auction.create({ data, include: { rematador: true } });
  },

  async update(id: string, data: Partial<{
    titulo: string; descripcion: string; fechaHora: Date; ubicacion: string;
    status: AuctionStatus; esColeccion: boolean; nombreColeccion: string; rematadorId: string;
  }>) {
    return prisma.auction.update({ where: { id }, data, include: { rematador: true } });
  },
};
