import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { unauthorized, forbidden } from '../utils/apiResponse';
import { prisma } from '../config/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    unauthorized(res);
    return;
  }
  const token = header.split(' ')[1];
  try {
    const user = verifyAccessToken(token);
    const app = await prisma.personaApp.findUnique({
      where: { personaId: parseInt(user.userId) },
      select: { registrationStatus: true },
    });
    if (app?.registrationStatus === 'bloqueado') {
      forbidden(res, 'Tu cuenta está bloqueada');
      return;
    }
    if (app?.registrationStatus === 'suspendido') {
      forbidden(res, 'Tu cuenta está suspendida');
      return;
    }
    req.user = user;
    next();
  } catch {
    unauthorized(res, 'Token inválido o expirado');
  }
}

export function optionalToken(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyAccessToken(header.split(' ')[1]);
    } catch {
      // ignored
    }
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.isAdmin) {
    forbidden(res, 'Se requieren permisos de administrador');
    return;
  }
  next();
}
