import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authService } from '../../services/auth.service';
import { badRequest, ok, notFound, serverError } from '../../utils/apiResponse';
import { getPagination } from '../../utils/pagination';
import { UserCategory, UserStatus } from '@prisma/client';
import { env } from '../../config/env';

export const adminUserController = {
  async list(req: Request, res: Response) {
    try {
      const { skip, limit, page } = getPagination(req);
      const { status, categoria } = req.query;
      const where: any = {};
      if (status) where.status = status as UserStatus;
      if (categoria) where.categoria = categoria as UserCategory;
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where, skip, take: limit,
          select: { id: true, nombre: true, apellido: true, email: true, categoria: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);
      return ok(res, { users, total, page });
    } catch (err: any) { return serverError(res, err.message); }
  },

  async setCategory(req: Request, res: Response) {
    try {
      const { categoria } = req.body;
      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: { categoria: categoria as UserCategory },
      });
      return ok(res, user);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async setStatus(req: Request, res: Response) {
    try {
      const { status, email } = req.body;
      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: { status: status as UserStatus },
      });
      // Al aprobar, se habilita la segunda etapa de registro: el usuario recibe
      // el token para ingresar a la app y generar su clave personal.
      const targetEmail = email || user.email;
      if (status === 'aprobado' && targetEmail && !user.passwordHash) {
        await authService.generateRegistrationToken(req.params.id, targetEmail);
      }
      return ok(res, user);
    } catch (err: any) { return serverError(res, err.message); }
  },

  async approveRegistration(req: Request, res: Response) {
    try {
      const { categoria, email } = req.body;
      if (categoria && !['comun', 'especial', 'plata', 'oro', 'platino'].includes(categoria)) {
        return badRequest(res, 'Categoría inválida');
      }

      const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (!existing) return notFound(res, 'Usuario no encontrado');

      const targetEmail = email || existing.email;
      if (!targetEmail) return badRequest(res, 'El usuario necesita un email para completar el registro');

      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: {
          status: 'aprobado',
          categoria: (categoria || existing.categoria) as UserCategory,
          email: targetEmail,
        },
        select: {
          id: true,
          nombre: true,
          apellido: true,
          email: true,
          categoria: true,
          status: true,
          passwordHash: true,
        },
      });

      let completionToken: string | null = null;
      if (!user.passwordHash) {
        completionToken = await authService.generateRegistrationToken(user.id, targetEmail);
      }

      return ok(res, {
        user: {
          id: user.id,
          nombre: user.nombre,
          apellido: user.apellido,
          email: user.email,
          categoria: user.categoria,
          status: user.status,
        },
        completionToken,
        completionUrl: completionToken ? `${env.MOBILE_COMPLETE_REGISTRATION_URL}?token=${completionToken}` : null,
      });
    } catch (err: any) { return serverError(res, err.message); }
  },

  async verifyPaymentMethod(req: Request, res: Response) {
    try {
      const { verificado } = req.body;
      const pm = await prisma.paymentMethod.update({
        where: { id: req.params.pmId },
        data: { verificado: Boolean(verificado) },
      });
      return ok(res, pm);
    } catch (err: any) { return serverError(res, err.message); }
  },
};
