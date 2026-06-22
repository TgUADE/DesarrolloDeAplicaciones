import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../config/prisma';
import { env } from '../config/env';

export function initWebSocket(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, { cors: { origin: env.FRONTEND_URL, credentials: true } });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string;
    if (!token) return next(new Error('No token provided'));
    try {
      (socket as any).user = verifyAccessToken(token);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    const personaId = parseInt(user.userId);
    console.log(`[WS] User ${personaId} connected`);

    // Ver una subasta sin participar (catálogo): solo se une a la sala para recibir
    // los avances en vivo (item:sold, auction:item-changed), sin registrarse como postor.
    socket.on('watch', ({ auctionId }: { auctionId: string }) => {
      socket.join(`auction:${auctionId}`);
    });

    socket.on('join', async ({ auctionId }: { auctionId: string }) => {
      try {
        const subastaId = parseInt(auctionId);
        const count = await prisma.asistente.count({ where: { subastaId } });
        await prisma.asistente.upsert({
          where: { subastaId_clienteId: { subastaId, clienteId: personaId } },
          create: { subastaId, clienteId: personaId, numeroPostor: count + 1, app: { create: { isActive: true } } },
          update: { app: { upsert: { create: { isActive: true }, update: { isActive: true, joinedAt: new Date(), leftAt: null } } } },
        });
        socket.join(`auction:${auctionId}`);
        (socket as any).currentAuction = auctionId;
        console.log(`[WS] User ${personaId} joined auction ${auctionId}`);
      } catch {
        socket.emit('error', { message: 'No se pudo unir a la subasta' });
      }
    });

    socket.on('leave', async ({ auctionId }: { auctionId: string }) => {
      const subastaId = parseInt(auctionId);
      await prisma.asistenteApp.updateMany({ where: { asistente: { subastaId, clienteId: personaId } }, data: { isActive: false, leftAt: new Date() } });
      socket.leave(`auction:${auctionId}`);
      (socket as any).currentAuction = null;
    });

    socket.on('disconnect', async () => {
      const auctionId = (socket as any).currentAuction;
      if (auctionId) {
        const subastaId = parseInt(auctionId);
        await prisma.asistenteApp.updateMany({ where: { asistente: { subastaId, clienteId: personaId } }, data: { isActive: false, leftAt: new Date() } }).catch(() => {});
      }
      console.log(`[WS] User ${personaId} disconnected`);
    });
  });

  return io;
}
