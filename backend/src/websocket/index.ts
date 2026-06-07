import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../config/prisma';
import { env } from '../config/env';

export function initWebSocket(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true,
    },
  });

  // JWT auth middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string;
    if (!token) return next(new Error('No token provided'));
    try {
      const payload = verifyAccessToken(token);
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`[WS] User ${user.userId} connected`);

    socket.on('join', async ({ auctionId }: { auctionId: string }) => {
      try {
        await prisma.auctionParticipant.upsert({
          where: { auctionId_userId: { auctionId, userId: user.userId } },
          create: { auctionId, userId: user.userId, isActive: true },
          update: { isActive: true, joinedAt: new Date(), leftAt: null },
        });
        socket.join(`auction:${auctionId}`);
        (socket as any).currentAuction = auctionId;
        console.log(`[WS] User ${user.userId} joined auction ${auctionId}`);
      } catch (err) {
        socket.emit('error', { message: 'No se pudo unir a la subasta' });
      }
    });

    socket.on('leave', async ({ auctionId }: { auctionId: string }) => {
      await prisma.auctionParticipant.updateMany({
        where: { auctionId, userId: user.userId },
        data: { isActive: false, leftAt: new Date() },
      });
      socket.leave(`auction:${auctionId}`);
      (socket as any).currentAuction = null;
    });

    socket.on('disconnect', async () => {
      const auctionId = (socket as any).currentAuction;
      if (auctionId) {
        await prisma.auctionParticipant.updateMany({
          where: { auctionId, userId: user.userId },
          data: { isActive: false, leftAt: new Date() },
        }).catch(() => {});
      }
      console.log(`[WS] User ${user.userId} disconnected`);
    });
  });

  return io;
}
