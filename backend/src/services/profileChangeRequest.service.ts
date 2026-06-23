import { prisma } from '../config/prisma';
import { userService } from './user.service';

const personaSelect = {
  select: {
    identificador: true,
    nombre: true,
    direccion: true,
    app: { select: { apellido: true, email: true, cuentaCobro: true } },
  },
} as const;

export const profileChangeRequestService = {
  /** El usuario solicita cambiar sus datos. No se puede tener más de una pendiente. */
  async create(
    personaId: number,
    data: { nombre?: string; apellido?: string; domicilioLegal?: string; cuentaCobro?: string },
  ) {
    const pending = await prisma.profileChangeRequest.findFirst({ where: { personaId, estado: 'pendiente' } });
    if (pending) throw { status: 409, message: 'Ya tenés una solicitud de cambio de datos pendiente' };
    return prisma.profileChangeRequest.create({
      data: {
        personaId,
        nombre: data.nombre,
        apellido: data.apellido,
        domicilioLegal: data.domicilioLegal,
        cuentaCobro: data.cuentaCobro,
      },
    });
  },

  /** Solicitudes del propio usuario (la última primero). */
  async listForUser(personaId: number) {
    return prisma.profileChangeRequest.findMany({ where: { personaId }, orderBy: { createdAt: 'desc' } });
  },

  /** Listado para el admin, con los datos ACTUALES del usuario para comparar. Pendientes primero. */
  async listForAdmin(estado?: string) {
    const where = estado ? { estado } : {};
    const reqs = await prisma.profileChangeRequest.findMany({
      where,
      orderBy: [{ estado: 'asc' }, { createdAt: 'desc' }],
      include: { persona: personaSelect },
    });
    return reqs.map((r) => {
      const { persona, ...rest } = r;
      return {
        ...rest,
        persona: persona
          ? { id: persona.identificador.toString(), nombre: persona.nombre, apellido: persona.app?.apellido ?? '', email: persona.app?.email ?? null }
          : null,
        actual: persona
          ? {
              nombre: persona.nombre,
              apellido: persona.app?.apellido ?? '',
              domicilioLegal: persona.direccion ?? null,
              cuentaCobro: persona.app?.cuentaCobro ?? null,
            }
          : null,
      };
    });
  },

  /** El admin aprueba: se aplican los cambios al usuario. */
  async approve(id: string) {
    const req = await prisma.profileChangeRequest.findUnique({ where: { id } });
    if (!req) throw { status: 404, message: 'Solicitud no encontrada' };
    if (req.estado !== 'pendiente') throw { status: 400, message: 'La solicitud ya fue resuelta' };
    await userService.update(req.personaId, {
      nombre: req.nombre ?? undefined,
      apellido: req.apellido ?? undefined,
      domicilioLegal: req.domicilioLegal ?? undefined,
      cuentaCobro: req.cuentaCobro ?? undefined,
    });
    return prisma.profileChangeRequest.update({ where: { id }, data: { estado: 'aprobada' } });
  },

  /** El admin rechaza con un motivo. Los datos del usuario no cambian. */
  async reject(id: string, motivoRechazo?: string) {
    const req = await prisma.profileChangeRequest.findUnique({ where: { id } });
    if (!req) throw { status: 404, message: 'Solicitud no encontrada' };
    if (req.estado !== 'pendiente') throw { status: 400, message: 'La solicitud ya fue resuelta' };
    return prisma.profileChangeRequest.update({ where: { id }, data: { estado: 'rechazada', motivoRechazo } });
  },
};
