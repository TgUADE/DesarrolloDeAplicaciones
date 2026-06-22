import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

/**
 * Guarda una imagen base64 (o data URI) en disco bajo `UPLOAD_DIR/<subdir>` y
 * devuelve la URL pública. Se usa para subir imágenes desde el mobile, que envía
 * base64 en JSON (la New Architecture de RN no soporta archivos en FormData).
 */
export function saveBase64Image(base64: string, prefix: string, subdir = 'submissions'): string {
  const dir = path.join(env.UPLOAD_DIR, subdir);
  fs.mkdirSync(dir, { recursive: true });
  const data = base64.includes(',') ? base64.split(',')[1] : base64;
  const filename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
  fs.writeFileSync(path.join(dir, filename), Buffer.from(data, 'base64'));
  return `/uploads/${subdir}/${filename}`;
}
