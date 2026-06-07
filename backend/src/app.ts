import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import rateLimit from 'express-rate-limit';

import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { setupSwagger } from './docs/swagger';
import { env } from './config/env';

const app = express();

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

// Rate limiting on auth routes
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/auth', authLimiter);

app.use(express.json({ limit: '15mb' })); // límite alto para imágenes en base64 (registro desde mobile)
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

// Static file serving for uploads
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

// Swagger docs
setupSwagger(app);

// API Routes
app.use('/api', routes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// 404 & Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
