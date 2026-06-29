import { prisma } from '../config/prisma';
import { mapItem } from '../utils/flatten';
import { getSystemEmpleadoId } from '../utils/systemEmpleado';

const catalogItemInclude = {
  app: true,
  catalogo: { select: { subastaId: true } },
  producto: {
    include: {
      app: true,
      fotos: { orderBy: { app: { orden: 'asc' as const } }, include: { app: true } },
      duenio: { include: { persona: { select: { identificador: true, nombre: true, app: { select: { apellido: true } } } } } },
    },
  },
} as const;

const catalogInclude = {
  subasta: { include: { app: true } },
  responsable: { include: { persona: { select: { identificador: true, nombre: true, app: { select: { apellido: true } } } } } },
  items: {
    take: 1,
    include: { producto: { include: { app: true } } },
    orderBy: { app: { ordenEnSubasta: 'asc' as const } },
  },
  _count: { select: { items: true } },
} as const;

function mapCatalog(c: any) {
  const firstItem = c.items?.[0];
  return {
    id: c.identificador.toString(),
    identificador: c.identificador,
    descripcion: c.descripcion,
    subastaId: c.subastaId,
    subastaTitulo: c.subasta?.app?.titulo ?? null,
    status: c.subastaId ? 'asignado' : 'borrador',
    itemCount: c._count?.items ?? 0,
    moneda: firstItem?.producto?.app?.moneda ?? null,
    responsable: c.responsable?.persona
      ? {
          id: c.responsable.persona.identificador.toString(),
          nombre: c.responsable.persona.nombre,
          apellido: c.responsable.persona.app?.apellido ?? '',
        }
      : null,
  };
}

async function getCatalogCurrency(catalogoId: number) {
  const items = await prisma.itemCatalogo.findMany({
    where: { catalogoId },
    select: { producto: { select: { app: { select: { moneda: true } } } } },
  });
  const currencies = new Set(items.map((i) => i.producto.app?.moneda ?? 'ARS'));
  return currencies.size === 1 ? [...currencies][0] : null;
}

export const catalogService = {
  async list(filters: { status?: string; subastaId?: number }) {
    const where: any = {};
    if (filters.status === 'borrador') where.subastaId = null;
    if (filters.status === 'asignado') where.subastaId = { not: null };
    if (filters.subastaId != null) where.subastaId = filters.subastaId;

    const catalogos = await prisma.catalogo.findMany({
      where,
      include: catalogInclude,
      orderBy: { identificador: 'desc' },
      take: 100,
    });
    return { catalogs: catalogos.map(mapCatalog) };
  },

  async findById(id: number) {
    const catalogo = await prisma.catalogo.findUnique({ where: { identificador: id }, include: catalogInclude });
    return catalogo ? mapCatalog(catalogo) : null;
  },

  async create(data: { descripcion: string; responsableId?: number }) {
    const descripcion = data.descripcion?.trim();
    if (!descripcion) throw { status: 400, message: 'La descripción del catálogo es obligatoria' };

    const catalogo = await prisma.catalogo.create({
      data: {
        descripcion,
        responsableId: data.responsableId ?? (await getSystemEmpleadoId()),
      },
      include: catalogInclude,
    });
    return mapCatalog(catalogo);
  },

  async getItems(catalogoId: number, showPrices = true) {
    const catalogo = await prisma.catalogo.findUnique({ where: { identificador: catalogoId } });
    if (!catalogo) throw { status: 404, message: 'Catálogo no encontrado' };

    const items = await prisma.itemCatalogo.findMany({
      where: { catalogoId },
      include: catalogItemInclude,
      orderBy: { app: { ordenEnSubasta: 'asc' } },
    });
    return items.map((i) => mapItem(i, { includePrice: showPrices }));
  },

  async addItem(catalogoId: number, productoId: number, precioBase?: number, comision?: number) {
    const [catalogo, producto] = await Promise.all([
      prisma.catalogo.findUnique({ where: { identificador: catalogoId }, include: { subasta: { include: { app: true } } } }),
      prisma.producto.findUnique({ where: { identificador: productoId }, include: { app: true, itemsCatalogo: true } }),
    ]);
    if (!catalogo) throw { status: 404, message: 'Catálogo no encontrado' };
    if (!producto) throw { status: 404, message: 'Producto no encontrado' };
    if (producto.itemsCatalogo.length > 0) throw { status: 400, message: 'El producto ya pertenece a un catálogo' };
    if (!precioBase || Number(precioBase) <= 0.01) throw { status: 400, message: 'Ingresá un precio base válido' };
    if (!comision || Number(comision) <= 0.01) throw { status: 400, message: 'Ingresá una comisión válida' };

    const itemMoneda = producto.app?.moneda ?? 'ARS';
    if (catalogo.subasta) {
      const auctionMoneda = catalogo.subasta.app?.moneda ?? 'ARS';
      if (itemMoneda !== auctionMoneda) {
        throw { status: 400, message: `El ítem está valuado en ${itemMoneda} y la subasta es en ${auctionMoneda}` };
      }
    } else {
      const catalogMoneda = await getCatalogCurrency(catalogoId);
      if (catalogMoneda && catalogMoneda !== itemMoneda) {
        throw { status: 400, message: `El catálogo ya contiene piezas en ${catalogMoneda}. Creá otro catálogo para ${itemMoneda}.` };
      }
    }

    const count = await prisma.itemCatalogo.count({ where: { catalogoId } });
    const status = catalogo.subastaId ? 'en_subasta' : 'en_catalogo';
    const itemCatalogo = await prisma.itemCatalogo.create({
      data: {
        catalogoId,
        productoId,
        precioBase,
        comision,
        subastado: 'no',
        app: { create: { status, ordenEnSubasta: count + 1 } },
      },
      include: catalogItemInclude,
    });
    await prisma.producto.update({ where: { identificador: productoId }, data: { app: { update: { status } } } });
    return mapItem(itemCatalogo, { includePrice: true });
  },

  async assignToAuction(catalogoId: number, subastaId: number) {
    return prisma.$transaction(async (tx) => {
      const [catalogo, subasta, existingCatalog] = await Promise.all([
        tx.catalogo.findUnique({
          where: { identificador: catalogoId },
          include: { items: { include: { producto: { include: { app: true } } } } },
        }),
        tx.subasta.findUnique({ where: { identificador: subastaId }, include: { app: true } }),
        tx.catalogo.findFirst({ where: { subastaId } }),
      ]);

      if (!catalogo) throw { status: 404, message: 'Catálogo no encontrado' };
      if (!subasta) throw { status: 404, message: 'Subasta no encontrada' };
      if (subasta.estado !== 'programada') throw { status: 400, message: 'Solo podés asignar catálogos a subastas programadas' };
      if (catalogo.subastaId && catalogo.subastaId !== subastaId) throw { status: 409, message: 'El catálogo ya está asignado a otra subasta' };
      if (existingCatalog && existingCatalog.identificador !== catalogoId) throw { status: 409, message: 'La subasta ya tiene un catálogo asignado' };
      if (catalogo.items.length === 0) throw { status: 400, message: 'El catálogo no tiene ítems' };

      const auctionMoneda = subasta.app?.moneda ?? 'ARS';
      const invalid = catalogo.items.find((i) => (i.producto.app?.moneda ?? 'ARS') !== auctionMoneda);
      if (invalid) {
        throw { status: 400, message: `El catálogo contiene piezas que no están valuadas en ${auctionMoneda}` };
      }

      const updated = await tx.catalogo.update({
        where: { identificador: catalogoId },
        data: { subastaId },
        include: catalogInclude,
      });
      await tx.itemCatalogoApp.updateMany({ where: { item: { catalogoId }, status: 'en_catalogo' }, data: { status: 'en_subasta' } });
      await tx.productoApp.updateMany({ where: { producto: { itemsCatalogo: { some: { catalogoId } } }, status: 'en_catalogo' }, data: { status: 'en_subasta' } });
      return mapCatalog(updated);
    });
  },
};
