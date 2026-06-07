import { prisma } from '../config/prisma';
import { getPagination } from '../utils/pagination';
import { Request } from 'express';

export const submissionService = {
  async create(userId: string, data: {
    descripcion: string;
    datosHistoricos?: string;
    declaracionPropiedad: boolean;
    origenLicito: boolean;
    cuentaCobro?: string;
    images: string[];
  }) {
    if (data.images.length < 6) {
      throw { status: 400, message: 'Se requieren al menos 6 imágenes' };
    }
    return prisma.itemSubmission.create({
      data: {
        userId,
        descripcion: data.descripcion,
        datosHistoricos: data.datosHistoricos,
        declaracionPropiedad: data.declaracionPropiedad,
        origenLicito: data.origenLicito,
        cuentaCobro: data.cuentaCobro,
        images: {
          create: data.images.map((url, orden) => ({ url, orden })),
        },
      },
      include: { images: true },
    });
  },

  async findById(id: string) {
    return prisma.itemSubmission.findUnique({
      where: { id },
      include: { images: { orderBy: { orden: 'asc' } }, user: { select: { id: true, nombre: true, apellido: true } } },
    });
  },

  async listForUser(userId: string, req: Request) {
    const { skip, limit, page } = getPagination(req);
    const [submissions, total] = await Promise.all([
      prisma.itemSubmission.findMany({
        where: { userId },
        skip, take: limit,
        include: { images: { take: 1 } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.itemSubmission.count({ where: { userId } }),
    ]);
    return { submissions, total, page };
  },

  async listAll(req: Request, status?: string) {
    const { skip, limit, page } = getPagination(req);
    const where = status ? { status: status as any } : {};
    const [submissions, total] = await Promise.all([
      prisma.itemSubmission.findMany({
        where, skip, take: limit,
        include: { images: { take: 1 }, user: { select: { id: true, nombre: true, apellido: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.itemSubmission.count({ where }),
    ]);
    return { submissions, total, page };
  },

  async adminAccept(id: string, precioBaseOfrecido: number, comisionesInfo: string) {
    const sub = await prisma.itemSubmission.findUnique({ where: { id } });
    if (!sub) throw { status: 404, message: 'Solicitud no encontrada' };
    if (sub.status !== 'interesada') throw { status: 400, message: 'Estado inválido para esta acción' };
    return prisma.itemSubmission.update({
      where: { id },
      data: { status: 'precio_propuesto', precioBaseOfrecido, comisionesInfo },
    });
  },

  async adminReject(id: string, motivoRechazo: string) {
    const sub = await prisma.itemSubmission.findUnique({ where: { id } });
    if (!sub) throw { status: 404, message: 'Solicitud no encontrada' };
    return prisma.itemSubmission.update({
      where: { id },
      data: { status: 'rechazada_empresa', motivoRechazo },
    });
  },

  async userAccept(id: string, userId: string) {
    const sub = await prisma.itemSubmission.findFirst({ where: { id, userId } });
    if (!sub) throw { status: 404, message: 'Solicitud no encontrada' };
    if (sub.status !== 'precio_propuesto') throw { status: 400, message: 'Estado inválido' };
    return prisma.itemSubmission.update({
      where: { id },
      data: { status: 'aceptada_usuario' },
    });
  },

  async userReject(id: string, userId: string) {
    const sub = await prisma.itemSubmission.findFirst({ where: { id, userId } });
    if (!sub) throw { status: 404, message: 'Solicitud no encontrada' };
    if (sub.status !== 'precio_propuesto') throw { status: 400, message: 'Estado inválido' };
    return prisma.itemSubmission.update({
      where: { id },
      data: { status: 'rechazada_usuario' },
    });
  },
};
