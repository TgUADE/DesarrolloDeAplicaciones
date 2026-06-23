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
    const existing = await prisma.personaApp.findUnique({ where: { email: data.email } });
    if (existing) throw { status: 409, message: 'Ese email ya está registrado' };

    return prisma.persona.create({
      data: {
        nombre: data.nombre,
        direccion: data.domicilioLegal,
        app: {
          create: {
            apellido: data.apellido,
            email: data.email,
            paisOrigen: data.paisOrigen,
            docFrenteUrl: data.docFrenteUrl,
            docDorsoUrl: data.docDorsoUrl,
            registrationStatus: 'pendiente',
          },
        },
      },
      include: { app: true },
    });
  },

  async completeRegistration(token: string, password: string) {
    const app = await prisma.personaApp.findFirst({ where: { registrationToken: token } });
    if (!app) throw { status: 404, message: 'Token no encontrado' };
    if (app.registrationStatus !== 'aprobado') throw { status: 403, message: 'Usuario no aprobado' };
    if (app.tokenExpiresAt && app.tokenExpiresAt < new Date()) {
      throw { status: 410, message: 'El token ha expirado' };
    }
    if (!app.email) throw { status: 400, message: 'El usuario aprobado no tiene email asociado' };

    const passwordHash = await hashPassword(password);
    await prisma.personaApp.update({
      where: { personaId: app.personaId },
      data: { passwordHash, registrationToken: null, tokenExpiresAt: null },
    });
    return prisma.persona.findUniqueOrThrow({
      where: { identificador: app.personaId },
      include: { app: true, cliente: true },
    });
  },

  async login(email: string, password: string) {
    const app = await prisma.personaApp.findUnique({
      where: { email },
      include: { persona: { include: { cliente: true } } },
    });
    if (!app || !app.passwordHash) throw { status: 401, message: 'Credenciales inválidas' };

    const status = app.registrationStatus;
    if (status === 'bloqueado') throw { status: 403, message: 'Tu cuenta está bloqueada' };
    if (status === 'suspendido') throw { status: 403, message: 'Tu cuenta está suspendida' };
    if (status === 'pendiente') throw { status: 403, message: 'Tu cuenta aún no fue aprobada' };

    const valid = await comparePassword(password, app.passwordHash);
    if (!valid) throw { status: 401, message: 'Credenciales inválidas' };

    const persona = app.persona;
    const payload = { userId: persona.identificador.toString(), isAdmin: app.isAdmin };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: persona.identificador.toString(),
        nombre: persona.nombre,
        apellido: app.apellido,
        email: app.email,
        categoria: persona.cliente?.categoria ?? 'comun',
        status: app.registrationStatus,
        isAdmin: app.isAdmin,
      },
    };
  },

  async generateRegistrationToken(personaId: string, email: string) {
    const token = uuidv4();
    const tokenExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const id = parseInt(personaId);
    await prisma.personaApp.upsert({
      where: { personaId: id },
      create: { personaId: id, email, registrationToken: token, tokenExpiresAt },
      update: { email, registrationToken: token, tokenExpiresAt },
    });
    await emailService.sendRegistrationComplete(email, token);
    return token;
  },
};
