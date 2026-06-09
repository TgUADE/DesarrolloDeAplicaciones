import { Platform } from 'react-native';

/**
 * Host del backend.
 * - Emulador Android: 10.0.2.2 es el alias del host (tu Mac), no localhost.
 * - Simulador iOS / web: localhost.
 * - Dispositivo físico: reemplazar por la IP LAN de tu Mac (ej. http://192.168.0.x:3000).
 */
export const HOST = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export const API_URL = `${HOST}/api`;
export const UPLOADS_URL = `${HOST}/uploads`;
