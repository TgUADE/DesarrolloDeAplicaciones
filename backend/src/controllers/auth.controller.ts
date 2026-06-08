import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '../utils/jwt';
import { ok, created, badRequest, unauthorized, serverError } from '../utils/apiResponse';
import { env } from '../config/env';

/** Guarda una imagen en base64 (con o sin prefijo data URI) y devuelve su URL pública. */
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
      if (!isValidEmail(email)) {
        return badRequest(res, 'Email inválido');
      }

      // Acepta las fotos del documento por multipart (web) o por base64 en JSON (mobile).
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

      const user = await authService.registerStage1({ nombre, apellido, docFrenteUrl, docDorsoUrl, domicilioLegal, paisOrigen, email });
      return created(res, { id: user.id, nombre: user.nombre, apellido: user.apellido, status: user.status });
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  },

  async completeRegistration(req: Request, res: Response) {
    try {
      const token = String(req.body.token ?? '').trim();
      const password = String(req.body.password ?? '');
      if (!token || !password) {
        return badRequest(res, 'Token y contraseña son obligatorios');
      }
      if (String(password).length < 8) {
        return badRequest(res, 'La contraseña debe tener al menos 8 caracteres');
      }
      const user = await authService.completeRegistration(token, password);
      const payload = { userId: user.id, isAdmin: user.isAdmin };
      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      return ok(res, {
        accessToken,
        user: {
          id: user.id,
          nombre: user.nombre,
          apellido: user.apellido,
          email: user.email,
          categoria: user.categoria,
          status: user.status,
          isAdmin: user.isAdmin,
        },
      });
    } catch (err: any) {
      const status = err.status || 500;
      return res.status(status).json({ success: false, error: err.message });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const email = String(req.body.email ?? '').trim();
      const password = String(req.body.password ?? '');
      if (!email || !password) return badRequest(res, 'Email y contraseña son obligatorios');
      if (!isValidEmail(email)) return badRequest(res, 'Email inválido');
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
