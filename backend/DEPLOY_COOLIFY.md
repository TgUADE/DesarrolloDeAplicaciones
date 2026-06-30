# Deploy del backend a Coolify

Guía para publicar el backend de Subastas (Node + Express + Prisma + Socket.io) en
un servidor con Coolify, y para apuntar la app mobile a ese backend.

---

## 1. Qué quedó preparado en el repo

| Archivo | Para qué sirve |
|---|---|
| `Dockerfile` | Build multi-stage: `npm ci` → `prisma generate` → `tsc`. Imagen final con Node 20 + openssl. |
| `.dockerignore` | Evita copiar `node_modules`, `dist`, `.env`, uploads y `.git` al build. |
| `docker-entrypoint.sh` | En cada arranque corre `prisma db push` + `prisma/checks.ts` (los CHECK constraints), y opcionalmente el seed. Luego levanta el server. |

> Ya probé el build y un arranque real contra un Postgres de prueba:
> `db push` sincroniza el schema, se aplican los 20 CHECK constraints, y
> `/health` y `/api/docs` responden 200. La imagen está lista para Coolify.

El server escucha en el **puerto 3000** y expone:
- `GET /health` → healthcheck (lo usa Coolify)
- `GET /api/docs` → Swagger
- `GET /uploads/...` → archivos subidos (servidos como estáticos)

---

## 2. Variables de entorno en Coolify

Configurar estas en el servicio del backend (pestaña **Environment Variables**):

```env
DATABASE_URL=postgresql://USER:PASS@HOST:5432/DB   # la te da Coolify al crear el Postgres
JWT_SECRET=<secreto-largo-aleatorio>
JWT_REFRESH_SECRET=<otro-secreto-distinto>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://admin.tudominio.com          # URL del panel admin web (ver nota CORS)
UPLOAD_DIR=/app/uploads
SMTP_HOST=...
SMTP_PORT=587
SMTP_FROM=noreply@tudominio.com
# Opcional, solo la primera vez para cargar datos de ejemplo:
# SEED_ON_DEPLOY=true
```

**Generá los secretos JWT localmente** (no los pongas en el chat ni en git):

```bash
# Corré esto dos veces, uno para JWT_SECRET y otro para JWT_REFRESH_SECRET
openssl rand -base64 48
```

### Nota sobre CORS / `FRONTEND_URL`
- La **app mobile es nativa** (React Native), no manda header `Origin`, así que las
  llamadas a la API y los websockets de Socket.io **funcionan sin importar `FRONTEND_URL`**.
- `FRONTEND_URL` solo restringe a clientes de **navegador** (el panel admin web). Poné ahí
  la URL del admin. Si todavía no subís el admin, podés dejar un placeholder; no afecta a la app.
- Hoy `FRONTEND_URL` admite **un solo origen**. Si en el futuro necesitás varios (admin + landing),
  hay que ajustar el CORS en `src/app.ts` y `src/websocket/index.ts` para aceptar una lista.

---

## 3. Volumen persistente para `uploads/` (¡importante!)

`multer` guarda documentos/imágenes en `UPLOAD_DIR` (`/app/uploads`). Sin un volumen,
**se borran en cada redeploy**. En Coolify → servicio backend → **Storages / Persistent Storage**:

- **Mount path (dentro del container):** `/app/uploads`
- Nombre/volumen: el que quieras (ej. `subastas-uploads`)

---

## 4. Base de datos

Lo más simple: crear el Postgres **dentro de Coolify** (New Resource → Database → PostgreSQL).
Coolify te da la connection string interna; esa va en `DATABASE_URL`.
El `docker-entrypoint.sh` se encarga de crear el schema (`prisma db push`) en el primer arranque.

> El `db push` **no** usa el flag `--accept-data-loss`. Si un futuro cambio de schema
> implicara perder datos, el deploy va a fallar a propósito (avisándote) en vez de borrar nada.

---

## 5. Crear el servicio en Coolify (deploy desde Git)

1. **New Resource → Application → Public/Private Repository** (tu repo de GitHub).
2. **Branch:** `main`.
3. **Base Directory:** `/backend` (el Dockerfile está dentro de `backend/`).
4. **Build Pack:** `Dockerfile`.
5. **Port:** `3000`.
6. **Healthcheck path:** `/health`.
7. Cargar las **env vars** del punto 2 y el **volumen** del punto 3.
8. Asignar un **dominio** (ej. `api.tudominio.com`) o usar la URL random de Coolify.
9. **Deploy.**

Verificación post-deploy:
```
https://TU-BACKEND-COOLIFY.com/health     → {"status":"ok"}
https://TU-BACKEND-COOLIFY.com/api/docs   → Swagger
```

---

## 6. App mobile apuntando al backend

La app ya soporta `EXPO_PUBLIC_API_URL` (si no existe, usa el backend local).

```bash
cd frontend-mobile

# APK instalable para probar en el celu:
EXPO_PUBLIC_API_URL=https://TU-BACKEND-COOLIFY.com npx eas build -p android --profile preview

# Build para Play Store (.aab):
EXPO_PUBLIC_API_URL=https://TU-BACKEND-COOLIFY.com npx eas build -p android --profile production
```

Si `eas` no está configurado todavía:
```bash
cd frontend-mobile
npx eas login
npx eas build:configure
```

---

## 7. Pasarme la API token de Coolify (de forma segura)

Para que yo configure todo por la **API de Coolify** sin que el token quede en el chat:

```bash
# Corré esto VOS en tu terminal (NO lo pegues en el chat):
cat > ~/.coolify.env <<'EOF'
COOLIFY_URL=https://coolify.tudominio.com
COOLIFY_API_TOKEN=pegá-tu-token-acá
EOF
chmod 600 ~/.coolify.env
```

El token se crea en Coolify → **Keys & Tokens → API tokens** (es distinto de la clave SSH
"New Private Key" de la captura: esa es para que Coolify se conecte por SSH a un servidor).

Yo en cada comando hago `source ~/.coolify.env` y uso `$COOLIFY_API_TOKEN` en los headers
de `curl`, **sin imprimirlo nunca**. Cuando terminemos, podés revocar ese token desde Coolify.
