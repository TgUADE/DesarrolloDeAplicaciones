import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { env } from './env';

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    let folder = 'uploads';
    if (file.fieldname === 'docFrente' || file.fieldname === 'docDorso') {
      folder = path.join(env.UPLOAD_DIR, 'documents');
    } else if (file.fieldname === 'images') {
      folder = path.join(env.UPLOAD_DIR, 'submissions');
    } else if (file.fieldname === 'itemImages') {
      folder = path.join(env.UPLOAD_DIR, 'items');
    }
    // Crea la carpeta destino si todavía no existe.
    fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Solo se permiten imágenes JPEG, PNG o WEBP'));
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});
