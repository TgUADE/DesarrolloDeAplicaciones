import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * CHECK constraints del SQL legacy (EstructuraActual.sql) sobre las columnas
 * core. `prisma db push` no modela CHECKs, así que se aplican acá vía SQL crudo.
 * Cada uno se borra antes de crearse para que el script sea re-ejecutable.
 *
 * Nota: la regla "fecha de subasta >= hoy + 10 días" NO va como CHECK (no es
 * inmutable en Postgres); se valida en el backend.
 * Nota: subastas.estado se amplía al set real de la app (el SQL legacy tenía
 * 'abierta'/'carrada' [sic]); el resto respeta el SQL.
 */
type Check = { table: string; name: string; expr: string };

const checks: Check[] = [
  // ── 'si'/'no' (varchar(2)) ──────────────────────────────────────────────────
  { table: 'clientes', name: 'chk_clientes_admitido', expr: `"admitido" IN ('si','no')` },
  { table: 'duenios', name: 'chk_duenios_vfinanciera', expr: `"verificacionFinanciera" IN ('si','no')` },
  { table: 'duenios', name: 'chk_duenios_vjudicial', expr: `"verificacionJudicial" IN ('si','no')` },
  { table: 'seguros', name: 'chk_seguros_poliza', expr: `"polizaCombinada" IN ('si','no')` },
  { table: 'subastas', name: 'chk_subastas_deposito', expr: `"tieneDeposito" IN ('si','no')` },
  { table: 'subastas', name: 'chk_subastas_seguridad', expr: `"seguridadPropia" IN ('si','no')` },
  { table: 'productos', name: 'chk_productos_disponible', expr: `"disponible" IN ('si','no')` },
  { table: 'itemsCatalogo', name: 'chk_items_subastado', expr: `"subastado" IN ('si','no')` },
  { table: 'pujos', name: 'chk_pujos_ganador', expr: `"ganador" IN ('si','no')` },
  // ── Enumerados ──────────────────────────────────────────────────────────────
  { table: 'personas', name: 'chk_personas_estado', expr: `"estado" IN ('activo','inactivo')` },
  { table: 'clientes', name: 'chk_clientes_categoria', expr: `"categoria" IN ('comun','especial','plata','oro','platino')` },
  { table: 'subastas', name: 'chk_subastas_categoria', expr: `"categoria" IN ('comun','especial','plata','oro','platino')` },
  { table: 'subastas', name: 'chk_subastas_estado', expr: `"estado" IN ('programada','abierta','cerrada','finalizada')` },
  { table: 'duenios', name: 'chk_duenios_riesgo', expr: `"calificacionRiesgo" IN (1,2,3,4,5,6)` },
  // ── Montos ──────────────────────────────────────────────────────────────────
  { table: 'seguros', name: 'chk_seguros_importe', expr: `"importe" > 0` },
  { table: 'itemsCatalogo', name: 'chk_items_preciobase', expr: `"precioBase" > 0.01` },
  { table: 'itemsCatalogo', name: 'chk_items_comision', expr: `"comision" > 0.01` },
  { table: 'registroDeSubasta', name: 'chk_registro_importe', expr: `"importe" > 0.01` },
  { table: 'registroDeSubasta', name: 'chk_registro_comision', expr: `"comision" > 0.01` },
  { table: 'pujos', name: 'chk_pujos_importe', expr: `"importe" > 0.01` },
];

async function main() {
  for (const c of checks) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${c.table}" DROP CONSTRAINT IF EXISTS "${c.name}"`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "${c.table}" ADD CONSTRAINT "${c.name}" CHECK (${c.expr})`);
  }
  console.log(`✅ ${checks.length} CHECK constraints aplicados`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
