import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Host del backend.
 * - Emulador Android: 10.0.2.2 es el alias del host (tu Mac), no localhost.
 * - Simulador iOS / web: localhost.
 * - Dispositivo físico: usa EXPO_PUBLIC_API_URL o detecta la IP LAN del host de Expo.
 */
function normalizeHostUri(hostUri: string) {
  const parsed = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`);
  return `${parsed.protocol}//${parsed.hostname}:3000`;
}

function getHost() {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (apiUrl) return apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');

  const apiHost = process.env.EXPO_PUBLIC_API_HOST;
  if (apiHost) return normalizeHostUri(apiHost);

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) return normalizeHostUri(hostUri);

  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
}

export const HOST = getHost();

export const API_URL = `${HOST}/api`;
export const UPLOADS_URL = `${HOST}/uploads`;
