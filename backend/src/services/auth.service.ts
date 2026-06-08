import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/prisma';
import { hashPassword, comparePassword } from '../utils/bcrypt';
import { signAccessToken, signRefreshToken } from '../utils/jwt';
import { emailService } from './email.service';

export const authService = {
  async registerStage1(data: {
    nombre: string;
    apellido: string;
    docFrenteUrl: string;
    docDorsoUrl: string;
    domicilioLegal: string;
    paisOrigen: string;
    email: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw { status: 409, message: 'Ese email ya está registrado' };
    // Primera etapa: la empresa debe verificar y aprobar antes de que el
    // usuario pueda generar su clave personal.
    return prisma.user.create({ data });
  },

  async completeRegistration(token: string, password: string) {
    const user = await prisma.user.findFirst({
      where: { registrationToken: token },
    });
    if (!user) throw { status: 404, message: 'Token no encontrado' };
    if (user.status !== 'aprobado') throw { status: 403, message: 'Usuario no aprobado' };
    if (user.tokenExpiresAt && user.tokenExpiresAt < new Date()) {
      throw { status: 410, message: 'El token ha expirado' };
    }
    if (!user.email) throw { status: 400, message: 'El usuario aprobado no tiene email asociado' };

    const passwordHash = await hashPassword(password);
    return prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, registrationToken: null, tokenExpiresAt: null },
    });
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) throw { status: 401, message: 'Credenciales inválidas' };
    if (user.status === 'bloqueado') throw { status: 403, message: 'Tu cuenta está bloqueada' };
    if (user.status === 'suspendido') throw { status: 403, message: 'Tu cuenta está suspendida' };
    if (user.status === 'pendiente') throw { status: 403, message: 'Tu cuenta aún no fue aprobada' };

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw { status: 401, message: 'Credenciales inválidas' };

    const payload = { userId: user.id, isAdmin: user.isAdmin };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        categoria: user.categoria,
        status: user.status,
        isAdmin: user.isAdmin,
      },
    };
  },

  async generateRegistrationToken(userId: string, email: string) {
    const token = uuidv4();
    const tokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await prisma.user.update({
      where: { id: userId },
      data: { email, registrationToken: token, tokenExpiresAt },
    });
    await emailService.sendRegistrationComplete(email, token);
    return token;
  },
};
