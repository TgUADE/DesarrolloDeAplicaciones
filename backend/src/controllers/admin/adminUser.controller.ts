import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { authService } from '../../services/auth.service';
import { ok, notFound, serverError } from '../../utils/apiResponse';
import { getPagination } from '../../utils/pagination';
import { UserCategory, UserStatus } from '@prisma/client';

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
      // Flujo legacy: solo si el usuario aún no tiene clave (registro viejo en 2 etapas)
      // se envía el email con token para completar el registro. Los usuarios que se
      // registran con email+clave desde la app ya tienen credenciales y no lo necesitan.
      if (status === 'aprobado' && email && !user.passwordHash) {
        await authService.generateRegistrationToken(req.params.id, email);
      }
      return ok(res, user);
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
