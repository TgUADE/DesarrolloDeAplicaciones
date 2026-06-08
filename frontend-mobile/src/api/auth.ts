import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import { API_URL } from '@/constants/config';

const client = axios.create({ baseURL: API_URL, withCredentials: true });

export interface AuthUser {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  categoria: string;
  status: string;
  isAdmin: boolean;
}

/**
 * Inicia sesión contra el backend. Guarda el accessToken y el usuario en
 * AsyncStorage. El refreshToken viaja como cookie httpOnly (manejada por el SO).
 */
export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await client.post('/auth/login', { email, password });
  const { accessToken, user } = res.data.data as { accessToken: string; user: AuthUser };
  await AsyncStorage.setItem('accessToken', accessToken);
  await AsyncStorage.setItem('user', JSON.stringify(user));
  return user;
}

export interface RegisterPayload {
  nombre: string;
  apellido: string;
  domicilioLegal: string;
  paisOrigen: string;
  email: string;
  docFrenteBase64: string;
  docDorsoBase64: string;
}

/**
 * Primera etapa de registro: datos personales + email + fotos del documento.
 * Las fotos van como base64 dentro de un JSON (no FormData), porque la New
 * Architecture de React Native no soporta los archivos `{uri,name,type}` en
 * FormData ("Unsupported FormDataPart implementation"). El backend las decodifica.
 */
export async function register(payload: RegisterPayload): Promise<void> {
  await client.post('/auth/register', payload);
}

export interface CompleteRegistrationPayload {
  token: string;
  password: string;
}

/** Segunda etapa: luego de la aprobación, el usuario genera su clave personal. */
export async function completeRegistration(payload: CompleteRegistrationPayload): Promise<void> {
  await client.post('/auth/complete-registration', payload);
}

/** Devuelve el usuario guardado en sesión (o null si no hay). */
export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem('user');
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

/** Limpia la sesión local. */
export async function logout(): Promise<void> {
  await AsyncStorage.multiRemove(['accessToken', 'user']);
}
