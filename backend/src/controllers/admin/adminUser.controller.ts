import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authService } from '../../services/auth.service';
import { badRequest, ok, notFound, serverError } from '../../utils/apiResponse';
import { getPagination } from '../../utils/pagination';
import { env } from '../../config/env';
import { getSystemEmpleadoId } from '../../utils/systemEmpleado';
import { toSiNo, fromSiNo } from '../../utils/siNo';
import { paymentMethodService } from '../../services/paymentMethod.service';
import { profileChangeRequestService } from '../../services/profileChangeRequest.service';

export const adminUserController = {
  async list(req: Request, res: Response) {
    try {
      const { skip, limit, page } = getPagination(req);
      const { status, categoria } = req.query;
      const where: any = {};
      if (status) where.app = { registrationStatus: status as string };

      const [personas, total] = await Promise.all([
        prisma.persona.findMany({
          where,
          skip,
          take: limit,
          include: { cliente: true, app: true },
          orderBy: { app: { createdAt: 'desc' } },
        }),
        prisma.persona.count({ where }),
      ]);

      const users = personas
        .filter((p) => !categoria || p.cliente?.categoria === categoria)
        .map((p) => ({
          id: p.identificador.toString(),
          nombre: p.nombre,
          apellido: p.app?.apellido ?? '',
          email: p.app?.email ?? null,
          categoria: p.cliente?.categoria ?? null,
          status: p.app?.registrationStatus ?? 'pendiente',
          createdAt: p.app?.createdAt ?? null,
        }));

      return ok(res, { users, total, page });
    } catch (err: any) { return serverError(res, err.message); }
  },

  async setCategory(req: Request, res: Response) {
    try {
      const { categoria } = req.body;
      const id = parseInt(req.params.id);
      const cliente = await prisma.cliente.update({ where: { identificador: id }, data: { categoria } });
      return ok(res, cliente);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async setStatus(req: Request, res: Response) {
    try {
      const { status, email } = req.body;
      const id = parseInt(req.params.id);
      const app = await prisma.personaApp.upsert({
        where: { personaId: id },
        create: { personaId: id, registrationStatus: status },
        update: { registrationStatus: status },
      });
      const targetEmail = email || app.email;
      if (status === 'aprobado' && targetEmail && !app.passwordHash) {
        await authService.generateRegistrationToken(id.toString(), targetEmail);
      }
      return ok(res, { id: id.toString(), email: app.email, status: app.registrationStatus });
    } catch (err: any) { return serverError(res, err.message); }
  },

  async approveRegistration(req: Request, res: Response) {
    try {
      const { categoria, email } = req.body;
      if (categoria && !['comun', 'especial', 'plata', 'oro', 'platino'].includes(categoria)) {
        return badRequest(res, 'Categoría inválida');
      }
      const id = parseInt(req.params.id);
      const existing = await prisma.persona.findUnique({ where: { identificador: id }, include: { cliente: true, app: true } });
      if (!existing) return notFound(res, 'Usuario no encontrado');

      const targetEmail = email || existing.app?.email;
      if (!targetEmail) return badRequest(res, 'El usuario necesita un email para completar el registro');

      const app = await prisma.personaApp.upsert({
        where: { personaId: id },
        create: { personaId: id, registrationStatus: 'aprobado', email: targetEmail },
        update: { registrationStatus: 'aprobado', email: targetEmail },
      });

      // Crear o actualizar el Cliente asociado (verificador NOT NULL en el SQL legacy)
      const verificadorId = await getSystemEmpleadoId();
      const cliente = await prisma.cliente.upsert({
        where: { identificador: id },
        create: { identificador: id, categoria: categoria ?? 'comun', admitido: toSiNo(true), verificadorId },
        update: { categoria: categoria ?? existing.cliente?.categoria ?? 'comun', admitido: toSiNo(true) },
      });

      let completionToken: string | null = null;
      if (!app.passwordHash) {
        completionToken = await authService.generateRegistrationToken(id.toString(), targetEmail);
      }

      return ok(res, {
        user: { id: id.toString(), nombre: existing.nombre, apellido: app.apellido, email: app.email, categoria: cliente.categoria, status: app.registrationStatus },
        completionToken,
        completionUrl: completionToken ? `${env.MOBILE_COMPLETE_REGISTRATION_URL}?token=${completionToken}` : null,
      });
    } catch (err: any) { return serverError(res, err.message); }
  },

  async listPaymentMethods(req: Request, res: Response) {
    try {
      const { estado } = req.query;
      const paymentMethods = await paymentMethodService.listForAdmin(estado ? String(estado) : undefined);
      return ok(res, { paymentMethods });
    } catch (err: any) { return serverError(res, err.message); }
  },

  async verifyPaymentMethod(req: Request, res: Response) {
    try {
      // Acepta el nuevo `estado` (aprobada/rechazada/pendiente); compat con `verificado` booleano.
      const { estado, verificado } = req.body;
      const nuevoEstado = (estado as string) ?? (verificado ? 'aprobada' : 'pendiente');
      if (!['pendiente', 'aprobada', 'rechazada'].includes(nuevoEstado)) {
        return badRequest(res, 'Estado inválido');
      }
      const actual = await prisma.paymentMethod.findUnique({ where: { id: req.params.pmId } });
      if (!actual) return notFound(res, 'Medio de pago no encontrado');
      const montoDisponible = Number(actual.montoDisponible ?? actual.montoGarantia ?? 0);
      if (nuevoEstado === 'aprobada' && (!Number.isFinite(montoDisponible) || montoDisponible <= 0)) {
        return badRequest(res, 'No se puede aprobar un medio de pago sin monto disponible declarado');
      }
      const pm = await prisma.paymentMethod.update({
        where: { id: req.params.pmId },
        data: { estado: nuevoEstado, verificado: nuevoEstado === 'aprobada' },
      });
      return ok(res, pm);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async listDuenios(_req: Request, res: Response) {
    try {
      const duenios = await prisma.duenio.findMany({
        include: { persona: { select: { identificador: true, nombre: true, app: { select: { apellido: true, email: true } } } } },
        orderBy: { identificador: 'asc' },
      });
      const mapped = duenios.map((d) => ({
        id: d.identificador.toString(),
        nombre: d.persona.nombre,
        apellido: d.persona.app?.apellido ?? '',
        email: d.persona.app?.email ?? null,
        verificacionFinanciera: fromSiNo(d.verificacionFinanciera),
        verificacionJudicial: fromSiNo(d.verificacionJudicial),
        calificacionRiesgo: d.calificacionRiesgo,
      }));
      return ok(res, { duenios: mapped });
    } catch (err: any) { return serverError(res, err.message); }
  },

  async verifyDuenio(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const { verificacionFinanciera, verificacionJudicial, calificacionRiesgo } = req.body;
      if (calificacionRiesgo != null && ![1, 2, 3, 4, 5, 6].includes(Number(calificacionRiesgo))) {
        return badRequest(res, 'calificacionRiesgo debe estar entre 1 y 6');
      }
      const data: any = {};
      if (verificacionFinanciera !== undefined) data.verificacionFinanciera = toSiNo(Boolean(verificacionFinanciera));
      if (verificacionJudicial !== undefined) data.verificacionJudicial = toSiNo(Boolean(verificacionJudicial));
      if (calificacionRiesgo != null) data.calificacionRiesgo = Number(calificacionRiesgo);
      const duenio = await prisma.duenio.update({ where: { identificador: id }, data });
      return ok(res, {
        id: duenio.identificador.toString(),
        verificacionFinanciera: fromSiNo(duenio.verificacionFinanciera),
        verificacionJudicial: fromSiNo(duenio.verificacionJudicial),
        calificacionRiesgo: duenio.calificacionRiesgo,
      });
    } catch (err: any) { return serverError(res, err.message); }
  },

  // --- Solicitudes de cambio de datos de perfil ---
  async listProfileChangeRequests(req: Request, res: Response) {
    try {
      const { estado } = req.query;
      const requests = await profileChangeRequestService.listForAdmin(estado ? String(estado) : undefined);
      return ok(res, { requests });
    } catch (err: any) { return serverError(res, err.message); }
  },

  async approveProfileChangeRequest(req: Request, res: Response) {
    try {
      const request = await profileChangeRequestService.approve(req.params.id);
      return ok(res, request);
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  async rejectProfileChangeRequest(req: Request, res: Response) {
    try {
      const request = await profileChangeRequestService.reject(req.params.id, req.body.motivoRechazo);
      return ok(res, request);
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },
};
