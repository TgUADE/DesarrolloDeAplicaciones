# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Builder: instala deps, genera el cliente Prisma y compila TS → dist
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# Prisma necesita openssl para generar/usar el query engine en Debian
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias (incluye devDeps: prisma CLI, tsx, typescript)
COPY package.json package-lock.json ./
RUN npm ci

# Generar el cliente Prisma (necesita el schema)
COPY prisma ./prisma
RUN npx prisma generate

# Compilar el código fuente
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Runner: imagen final que ejecuta el server
# Mantiene node_modules completo (incluye prisma CLI + tsx) para que el
# entrypoint pueda correr `prisma db push` y `tsx prisma/checks.ts` en cada boot.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Artefactos del builder
COPY package.json package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Script de arranque (migra el schema y luego levanta el server)
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

# Carpeta de uploads (en Coolify se monta como volumen persistente en /app/uploads)
RUN mkdir -p /app/uploads

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
