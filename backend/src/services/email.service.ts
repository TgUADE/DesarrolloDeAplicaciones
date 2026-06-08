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
    const link = `${env.MOBILE_COMPLETE_REGISTRATION_URL}?token=${token}`;
    await send(
      to,
      'Subastas - Completá tu registro',
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f8f7f4;margin:0;padding:0;">
        <tr>
          <td style="padding:16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#ffffff;border:1px solid #d8d6cf;">
              <tr>
                <td style="background:#0f3460;color:#ffffff;padding:16px;font-family:Arial,sans-serif;font-size:20px;font-weight:bold;">
                  Tu cuenta fue aprobada
                </td>
              </tr>
              <tr>
                <td style="padding:16px;font-family:Arial,sans-serif;color:#1a1a1a;font-size:15px;line-height:22px;">
                  Ingresá a la app para completar tu registro y generar tu clave personal.
                </td>
              </tr>
              <tr>
                <td style="padding:0 16px 16px;">
                  <a href="${link}" style="display:block;background:#1d4e89;color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;text-align:center;text-decoration:none;padding:14px 12px;">
                    Completar registro
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding:0 16px 16px;font-family:Arial,sans-serif;color:#6b6b6b;font-size:13px;line-height:18px;">
                  El enlace expira en 48 horas.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`
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
