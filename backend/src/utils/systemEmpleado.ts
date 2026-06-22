import { prisma } from '../config/prisma';

/**
 * Email del empleado "sistema" sembrado por el seed. Se usa como
 * verificador / revisor / responsable por defecto cuando un flujo de la app no
 * provee uno (esas columnas son NOT NULL en el SQL legacy).
 */
export const SYSTEM_EMPLEADO_EMAIL = 'sistema@subastas.com';

let cachedId: number | null = null;

/** Devuelve (y cachea) el identificador del empleado "sistema". */
export async function getSystemEmpleadoId(): Promise<number> {
  if (cachedId != null) return cachedId;
  const app = await prisma.personaApp.findUnique({
    where: { email: SYSTEM_EMPLEADO_EMAIL },
    select: { personaId: true },
  });
  if (!app) {
    throw new Error('Falta el empleado "sistema". Ejecutá el seed (npm run seed).');
  }
  cachedId = app.personaId;
  return cachedId;
}

/**
 * Email del cliente "empresa" sembrado por el seed. Es quien "compra" las piezas
 * que no reciben ninguna puja (la empresa las adquiere al valor base).
 */
export const EMPRESA_CLIENTE_EMAIL = 'empresa@subastas.com';

let cachedEmpresaId: number | null = null;

/** Devuelve (y cachea) el identificador del cliente "empresa". */
export async function getEmpresaClienteId(): Promise<number> {
  if (cachedEmpresaId != null) return cachedEmpresaId;
  const app = await prisma.personaApp.findUnique({
    where: { email: EMPRESA_CLIENTE_EMAIL },
    select: { personaId: true },
  });
  if (!app) {
    throw new Error('Falta el cliente "empresa". Ejecutá el seed (npm run seed).');
  }
  cachedEmpresaId = app.personaId;
  return cachedEmpresaId;
}
