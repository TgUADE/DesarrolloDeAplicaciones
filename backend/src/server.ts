import 'dotenv/config';
import http from 'http';
import cron from 'node-cron';
import app from './app';
import { initWebSocket } from './websocket';
import { purchaseService } from './services/purchase.service';
import { auctionService } from './services/auction.service';
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

// Cierre automático de ítems cuyo temporizador (5 min desde la última puja) venció.
setInterval(async () => {
  try {
    const closed = await auctionService.autoCloseExpiredItems();
    for (const c of closed) {
      io.to(`auction:${c.auctionId}`).emit('item:sold', {
        closedItemId: c.closedItemId,
        purchase: c.purchase,
      });
      console.log(`[TIMER] Ítem cerrado por tiempo en subasta ${c.auctionId}`);
    }
  } catch (err) {
    console.error('[TIMER] Error en auto-cierre de ítems:', err);
  }
}, 10_000);

httpServer.listen(env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  console.log(`📧 Mailhog UI: http://localhost:8025`);
  console.log(`📚 API Docs: http://localhost:${env.PORT}/api/docs`);
});
