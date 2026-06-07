import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
});

async function send(to: string, subject: string, html: string) {
  await transporter.sendMail({ from: env.SMTP_FROM, to, subject, html });
}

export const emailService = {
  async sendRegistrationComplete(to: string, token: string) {
    const link = `${env.FRONTEND_URL}/auth/complete-registration?token=${token}`;
    await send(
      to,
      'Subastas - Completá tu registro',
      `<h2>Tu cuenta fue aprobada</h2>
       <p>Hacé clic en el enlace para completar tu registro y generar tu contraseña:</p>
       <a href="${link}">${link}</a>
       <p>El enlace expira en 48 horas.</p>`
    );
  },

  async sendApprovalNotification(to: string, categoria: string) {
    await send(
      to,
      'Subastas - Cuenta aprobada',
      `<h2>¡Tu cuenta fue aprobada!</h2>
       <p>Categoría asignada: <strong>${categoria}</strong></p>
       <p>Revisá tu correo para completar el registro.</p>`
    );
  },

  async sendFineNotification(to: string, monto: number, moneda: string) {
    await send(
      to,
      'Subastas - Multa aplicada',
      `<h2>Se aplicó una multa a tu cuenta</h2>
       <p>Monto de la multa: <strong>${moneda} ${monto}</strong></p>
       <p>Debés abonarla antes de participar en otra subasta.</p>
       <p>Tenés 72 horas para presentar los fondos de la oferta realizada.</p>`
    );
  },
};
