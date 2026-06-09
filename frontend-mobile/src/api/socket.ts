import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, type Socket } from 'socket.io-client';

import { HOST } from '@/constants/config';

/**
 * Crea (sin conectar todavía) un socket autenticado contra el backend.
 * El server espera el accessToken en `handshake.auth.token` (ver
 * backend/src/websocket/index.ts). Eventos:
 *  - emitir  'join'  { auctionId }  → suscribe a la sala de la subasta
 *  - emitir  'leave' { auctionId }
 *  - recibir 'bid:new' { puja, mejorOferta }
 *  - recibir 'error'   { message }
 */
export async function createAuctionSocket(): Promise<Socket> {
  const token = await AsyncStorage.getItem('accessToken');
  return io(HOST, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: false,
  });
}
