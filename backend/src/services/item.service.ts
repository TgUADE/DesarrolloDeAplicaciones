import { prisma } from '../config/prisma';

export const itemService = {
  async findById(id: string, includePrice = false) {
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        images: { orderBy: { orden: 'asc' } },
        currentOwner: { select: { id: true, nombre: true, apellido: true } },
        insurance: true,
        ubicacion: true,
      },
    });
    if (!item) return null;
    if (!includePrice) {
      const { precioBase: _, ...rest } = item;
      return rest;
    }
    return item;
  },

  async getBids(itemId: string) {
    const bids = await prisma.puja.findMany({
      where: { itemId, confirmada: true },
      include: { user: { select: { id: true, nombre: true, apellido: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const mejorOferta = bids.length > 0 ? bids[0].monto : null;
    return { bids, mejorOferta };
  },

  async getLocation(id: string) {
    return prisma.itemUbicacion.findUnique({ where: { itemId: id } });
  },

  async getInsurance(id: string) {
    return prisma.seguro.findUnique({ where: { itemId: id } });
  },

  async upsertInsurance(itemId: string, data: {
    polizaNumero: string;
    valorAsegurado: number;
    proveedor: string;
    beneficiarioId: string;
    vencimiento?: Date;
    contacto?: string;
    polizaGrupoId?: string;
  }) {
    return prisma.seguro.upsert({
      where: { itemId },
      create: { itemId, ...data },
      update: data,
    });
  },

  async upsertLocation(itemId: string, data: { deposito: string; sector?: string; notas?: string }) {
    return prisma.itemUbicacion.upsert({
      where: { itemId },
      create: { itemId, ...data },
      update: data,
    });
  },
};
