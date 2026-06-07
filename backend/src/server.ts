import 'dotenv/config';
import http from 'http';
import cron from 'node-cron';
import app from './app';
import { initWebSocket } from './websocket';
import { purchaseService } from './services/purchase.service';
import { env } from './config/env';

const httpServer = http.createServer(app);
const io = initWebSocket(httpServer);

// Make io accessible from controllers via app.get('io')
app.set('io', io);

// Cron: check expired fines every hour
cron.schedule('0 * * * *', async () => {
  try {
    const count = await purchaseService.checkExpiredFines();
    if (count > 0) console.log(`[CRON] Procesadas ${count} multas vencidas`);
  } catch (err) {
    console.error('[CRON] Error procesando multas:', err);
  }
});

httpServer.listen(env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  console.log(`📧 Mailhog UI: http://localhost:8025`);
  console.log(`📚 API Docs: http://localhost:${env.PORT}/api/docs`);
});
