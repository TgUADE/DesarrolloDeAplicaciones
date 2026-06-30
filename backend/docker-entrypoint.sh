#!/bin/sh
set -e

echo "→ Sincronizando esquema de la base (prisma db push)..."
npx prisma db push --skip-generate

echo "→ Aplicando CHECK constraints (prisma/checks.ts)..."
npx tsx prisma/checks.ts

# Seed opcional: solo si SEED_ON_DEPLOY=true (útil para la primera carga).
# Dejarlo en "false"/sin definir en deploys normales para no duplicar datos.
if [ "$SEED_ON_DEPLOY" = "true" ]; then
  echo "→ Ejecutando seed inicial (prisma/seed.ts)..."
  npx tsx prisma/seed.ts
fi

echo "→ Iniciando servidor..."
exec "$@"
