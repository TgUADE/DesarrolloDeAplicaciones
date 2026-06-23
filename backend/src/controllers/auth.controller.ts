import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '../utils/jwt';
import { ok, created, badRequest, unauthorized, serverError } from '../utils/apiResponse';
import { env } from '../config/env';

function saveBase64Image(base64: string, prefix: string): string {
  const dir = path.join(env.UPLOAD_DIR, 'documents');
  fs.mkdirSync(dir, { recursive: true });
  const data = base64.includes(',') ? base64.split(',')[1] : base64;
  const filename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
  fs.writeFileSync(path.join(dir, filename), Buffer.from(data, 'base64'));
  return `/uploads/documents/${filename}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const nombre = String(req.body.nombre ?? '').trim();
      const apellido = String(req.body.apellido ?? '').trim();
      const domicilioLegal = String(req.body.domicilioLegal ?? '').trim();
      const paisOrigen = String(req.body.paisOrigen ?? '').trim();
      const email = String(req.body.email ?? '').trim();
      const { docFrenteBase64, docDorsoBase64 } = req.body;
      if (!nombre || !apellido || !domicilioLegal || !paisOrigen || !email) {
        return badRequest(res, 'Nombre, apellido, domicilio legal, país de origen y email son obligatorios');
      }
      if (!isValidEmail(email)) return badRequest(res, 'Email inválido');

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      let docFrenteUrl: string;
      let docDorsoUrl: string;
      if (files?.docFrente?.[0] && files?.docDorso?.[0]) {
        docFrenteUrl = `/uploads/documents/${files.docFrente[0].filename}`;
        docDorsoUrl = `/uploads/documents/${files.docDorso[0].filename}`;
      } else if (docFrenteBase64 && docDorsoBase64) {
        docFrenteUrl = saveBase64Image(docFrenteBase64, 'docFrente');
        docDorsoUrl = saveBase64Image(docDorsoBase64, 'docDorso');
      } else {
        return badRequest(res, 'Se requieren fotos del documento (frente y dorso)');
      }

      const persona = await authService.registerStage1({ nombre, apellido, docFrenteUrl, docDorsoUrl, domicilioLegal, paisOrigen, email });
      return created(res, { id: persona.identificador.toString(), nombre: persona.nombre, apellido: persona.app?.apellido ?? '', status: persona.app?.registrationStatus ?? 'pendiente' });
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  async completeRegistration(req: Request, res: Response) {
    try {
      const token = String(req.body.token ?? '').trim();
      const password = String(req.body.password ?? '');
      if (!token || !password) return badRequest(res, 'Token y contraseña son obligatorios');
      if (password.length < 8) return badRequest(res, 'La contraseña debe tener al menos 8 caracteres');
      const persona = await authService.completeRegistration(token, password);
      const payload = { userId: persona.identificador.toString(), isAdmin: persona.app?.isAdmin ?? false };
      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);
      res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
      return ok(res, {
        accessToken,
        user: { id: persona.identificador.toString(), nombre: persona.nombre, apellido: persona.app?.apellido ?? '', email: persona.app?.email ?? null, categoria: persona.cliente?.categoria ?? 'comun', status: persona.app?.registrationStatus ?? 'aprobado', isAdmin: persona.app?.isAdmin ?? false },
      });
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const email = String(req.body.email ?? '').trim();
      const password = String(req.body.password ?? '');
      if (!email || !password) return badRequest(res, 'Email y contraseña son obligatorios');
      if (!isValidEmail(email)) return badRequest(res, 'Email inválido');
      const result = await authService.login(email, password);
      res.cookie('refreshToken', result.refreshToken, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
      return ok(res, { accessToken: result.accessToken, user: result.user });
    } catch (err: any) {
      return res.status(err.status || 500).json({ success: false, error: err.message });
    }
  },

  async logout(_req: Request, res: Response) {
    res.clearCookie('refreshToken');
    return ok(res, { message: 'Sesión cerrada' });
  },

  async me(req: Request, res: Response) {
    try {
      const { prisma } = await import('../config/prisma');
      const persona = await prisma.persona.findUnique({
        where: { identificador: parseInt(req.user!.userId) },
        include: { cliente: true, app: true },
      });
      if (!persona) return unauthorized(res);
      return ok(res, {
        id: persona.identificador.toString(),
        nombre: persona.nombre,
        apellido: persona.app?.apellido ?? '',
        email: persona.app?.email ?? null,
        categoria: persona.cliente?.categoria ?? 'comun',
        status: persona.app?.registrationStatus ?? 'pendiente',
        isAdmin: persona.app?.isAdmin ?? false,
        createdAt: persona.app?.createdAt ?? null,
      });
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
