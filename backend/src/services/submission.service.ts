import { prisma } from '../config/prisma';
import { getPagination } from '../utils/pagination';
import { flattenPersonaLite } from '../utils/flatten';
import { getSystemEmpleadoId } from '../utils/systemEmpleado';
import { ensureSeguro } from './item.service';
import { Request } from 'express';

const personaLiteSelect = { select: { identificador: true, nombre: true, app: { select: { apellido: true, email: true } } } } as const;

type SubWithImages = {
  id: string;
  personaId: number;
  nombre: string | null;
  descripcion: string;
  artista: string | null;
  fechaEpoca: string | null;
  datosHistoricos: string | null;
  moneda: string | null;
  images: { url: string; orden: number }[];
};

/**
 * Materializa un Producto a partir de una solicitud aceptada: asegura el Duenio,
 * copia las imágenes a Foto/FotoApp, autocrea el seguro y asigna depósito.
 * Idempotente (no duplica si el producto ya existe para esa solicitud).
 */
async function materializeProducto(sub: SubWithImages, base: number) {
  const yaCreado = await prisma.productoApp.findUnique({ where: { submissionId: sub.id } });
  if (yaCreado) return;
  const revisorId = await getSystemEmpleadoId();
  await prisma.duenio.upsert({
    where: { identificador: sub.personaId },
    create: { identificador: sub.personaId, verificadorId: revisorId },
    update: {},
  });
  const titulo = (sub.nombre?.trim() || sub.descripcion).slice(0, 300);
  const producto = await prisma.producto.create({
    data: {
      descripcionCompleta: titulo,
      descripcionCatalogo: sub.descripcion.slice(0, 500),
      disponible: 'si',
      duenioId: sub.personaId,
      revisorId,
      fotos: { create: sub.images.map((img) => ({ app: { create: { url: img.url, orden: img.orden } } })) },
      app: {
        create: {
          numeroPieza: `PIEZA-${sub.id.slice(0, 10).toUpperCase()}`,
          esObraDeArte: !!sub.artista?.trim(),
          artista: sub.artista?.trim() || undefined,
          fechaObra: sub.fechaEpoca?.trim() || undefined,
          historia: sub.datosHistoricos ?? undefined,
          status: 'disponible',
          moneda: sub.moneda ?? 'ARS',
          deposito: 'Depósito Central',
          ubicacion: 'Estante por asignar',
          submissionId: sub.id,
        },
      },
    },
  });
  if (base > 0.01) await ensureSeguro(producto.identificador, base, sub.personaId);
}

export const submissionService = {
  async create(
    personaId: number,
    data: {
      nombre?: string;
      descripcion: string;
      artista?: string;
      fechaEpoca?: string;
      datosHistoricos?: string;
      declaracionPropiedad: boolean;
      origenLicito: boolean;
      precioSugerido?: number;
      moneda?: string;
      cuentaCobro?: string;
      images: string[];
    },
  ) {
    if (data.images.length < 6) throw { status: 400, message: 'Se requieren al menos 6 imágenes' };
    if (data.moneda && !['ARS', 'USD'].includes(data.moneda)) throw { status: 400, message: 'Moneda inválida' };
    return prisma.itemSubmission.create({
      data: {
        personaId,
        nombre: data.nombre,
        descripcion: data.descripcion,
        artista: data.artista,
        fechaEpoca: data.fechaEpoca,
        datosHistoricos: data.datosHistoricos,
        declaracionPropiedad: data.declaracionPropiedad,
        origenLicito: data.origenLicito,
        precioSugerido: data.precioSugerido != null ? data.precioSugerido : undefined,
        moneda: data.moneda,
        cuentaCobro: data.cuentaCobro,
        images: { create: data.images.map((url, orden) => ({ url, orden })) },
      },
      include: { images: true },
    });
  },

  async findById(id: string) {
    const sub = await prisma.itemSubmission.findUnique({
      where: { id },
      include: { images: { orderBy: { orden: 'asc' } }, persona: personaLiteSelect },
    });
    return sub ? { ...sub, persona: flattenPersonaLite(sub.persona) } : null;
  },

  async listForUser(personaId: number, req: Request) {
    const { skip, limit, page } = getPagination(req);
    const [submissions, total] = await Promise.all([
      prisma.itemSubmission.findMany({
        where: { personaId },
        skip,
        take: limit,
        include: { images: { take: 1, orderBy: { orden: 'asc' } }, _count: { select: { images: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.itemSubmission.count({ where: { personaId } }),
    ]);
    return { submissions, total, page };
  },

  async listAll(req: Request, status?: string) {
    const { skip, limit, page } = getPagination(req);
    const where = status ? { status } : {};
    const [submissions, total] = await Promise.all([
      prisma.itemSubmission.findMany({
        where,
        skip,
        take: limit,
        include: { images: { take: 1, orderBy: { orden: 'asc' } }, _count: { select: { images: true } }, persona: personaLiteSelect },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.itemSubmission.count({ where }),
    ]);
    return { submissions: submissions.map((s) => ({ ...s, persona: flattenPersonaLite(s.persona) })), total, page };
  },

  /**
   * La empresa ACEPTA la solicitud al precio acordado (por defecto el que pidió el
   * solicitante) → la pieza pasa a estar disponible para una futura subasta.
   */
  async adminAccept(id: string, precioBaseOfrecido?: number, comisionesInfo?: string) {
    const sub = await prisma.itemSubmission.findUnique({ where: { id }, include: { images: { orderBy: { orden: 'asc' } } } });
    if (!sub) throw { status: 404, message: 'Solicitud no encontrada' };
    if (!['pendiente_empresa', 'interesada', 'precio_propuesto'].includes(sub.status)) {
      throw { status: 400, message: 'Estado inválido para esta acción' };
    }
    const base = precioBaseOfrecido != null && !Number.isNaN(precioBaseOfrecido) ? precioBaseOfrecido : Number(sub.precioSugerido ?? 0);
    const updated = await prisma.itemSubmission.update({
      where: { id },
      data: { status: 'aceptada_usuario', precioBaseOfrecido: base, comisionesInfo },
    });
    await materializeProducto(sub, base);
    return updated;
  },

  async adminReject(id: string, motivoRechazo: string) {
    const sub = await prisma.itemSubmission.findUnique({ where: { id } });
    if (!sub) throw { status: 404, message: 'Solicitud no encontrada' };
    return prisma.itemSubmission.update({ where: { id }, data: { status: 'rechazada_empresa', motivoRechazo } });
  },

  async userAccept(id: string, personaId: number) {
    const sub = await prisma.itemSubmission.findFirst({ where: { id, personaId }, include: { images: { orderBy: { orden: 'asc' } } } });
    if (!sub) throw { status: 404, message: 'Solicitud no encontrada' };
    if (sub.status !== 'precio_propuesto') throw { status: 400, message: 'Estado inválido' };
    const updated = await prisma.itemSubmission.update({ where: { id }, data: { status: 'aceptada_usuario' } });
    await materializeProducto(sub, Number(sub.precioBaseOfrecido ?? sub.precioSugerido ?? 0));
    return updated;
  },

  async userReject(id: string, personaId: number) {
    const sub = await prisma.itemSubmission.findFirst({ where: { id, personaId } });
    if (!sub) throw { status: 404, message: 'Solicitud no encontrada' };
    if (sub.status !== 'precio_propuesto') throw { status: 400, message: 'Estado inválido' };
    return prisma.itemSubmission.update({ where: { id }, data: { status: 'rechazada_usuario' } });
  },
};
