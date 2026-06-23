import 'dotenv/config';
import os from 'os';

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing environment variable: ${key}`);
  return val;
}

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  const VIRTUAL = [
    /^10\.0\.2\./,              // Android emulator virtual network
    /^172\.(1[6-9]|2\d|3[01])\./, // Docker
    /^192\.168\.56\./           // VirtualBox host-only
  ];

  const candidates: string[] = [];
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family !== 'IPv4' || entry.internal) continue;
      if (VIRTUAL.some(re => re.test(entry.address))) continue;
      candidates.push(entry.address);
    }
  }

  // Preferir 192.168.x.x (WiFi doméstica/oficina), luego cualquier otra
  return candidates.find(ip => ip.startsWith('192.168.')) ?? candidates[0] ?? null;
}

function getMobileCompleteRegistrationUrl() {
  const explicit = process.env.MOBILE_COMPLETE_REGISTRATION_URL;
  if (explicit) return explicit;

  const host = getLocalIpAddress();
  if (host) return `exp://${host}:8081/--/register-credentials`;

  return 'exp://10.0.2.2:8081/--/register-credentials';
}

export const env = {
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  PORT: parseInt(process.env.PORT || '3000', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  MOBILE_COMPLETE_REGISTRATION_URL: getMobileCompleteRegistrationUrl(),
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  SMTP_HOST: process.env.SMTP_HOST || 'localhost',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '1025', 10),
  SMTP_FROM: process.env.SMTP_FROM || 'noreply@subastas.com',
  NODE_ENV: process.env.NODE_ENV || 'development',
};
