import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { verifyRefreshToken, signAccessToken } from '../utils/jwt';
import { ok, created, badRequest, unauthorized, serverError } from '../utils/apiResponse';
import { env } from '../config/env';

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const { nombre, apellido, domicilioLegal, paisOrigen } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (!files?.docFrente?.[0] || !files?.docDorso?.[0]) {
        return badRequest(res, 'Se requieren fotos del documento (frente y dorso)');
      }
      const docFrenteUrl = `/uploads/documents/${files.docFrente[0].filename}`;
      const docDorsoUrl = `/uploads/documents/${files.docDorso[0].filename}`;
      const user = await authService.registerStage1({ nombre, apellido, docFrenteUrl, docDorsoUrl, domicilioLegal, paisOrigen });
      return created(res, { id: user.id, nombre: user.nombre, apellido: user.apellido, status: user.status });
    } catch (err: any) {
      return serverError(res, err.message);
    }
  },

  async completeRegistration(req: Request, res: Response) {
    try {
      const { token, email, password } = req.body;
      await authService.completeRegistration(token, email, password);
      return ok(res, { message: 'Registro completado exitosamente' });
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      return ok(res, { accessToken: result.accessToken, user: result.user });
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  },

  async logout(req: Request, res: Response) {
    res.clearCookie('refreshToken');
    return ok(res, { message: 'Sesión cerrada' });
  },

  async me(req: Request, res: Response) {
    try {
      const { prisma } = await import('../config/prisma');
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { id: true, nombre: true, apellido: true, email: true, categoria: true, status: true, isAdmin: true, createdAt: true },
      });
      if (!user) return unauthorized(res);
      return ok(res, user);
    } catch (err: any) {
      return serverError(res, err.message);
    }
  },

  async refresh(req: Request, res: Response) {
    try {
      const token = req.cookies?.refreshToken;
      if (!token) return unauthorized(res, 'No hay refresh token');
      const payload = verifyRefreshToken(token);
      const accessToken = signAccessToken({ userId: payload.userId, isAdmin: payload.isAdmin });
      return ok(res, { accessToken });
    } catch {
      return unauthorized(res, 'Refresh token inválido');
    }
  },
};
