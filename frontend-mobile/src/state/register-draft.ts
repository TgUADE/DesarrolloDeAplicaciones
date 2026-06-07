/**
 * Borrador del registro compartido entre el Paso 1 y el Paso 2.
 * Se usa un store en memoria (no params de navegación) porque las URIs de las
 * fotos contienen caracteres como "@anonymous/" que expo-router URL-encodea,
 * dejando una ruta ilegible para el sistema de archivos.
 */
export interface RegisterDraft {
  nombre: string;
  apellido: string;
  domicilioLegal: string;
  paisOrigen: string;
  email: string;
  docFrente: string; // URI local de la foto (frente)
  docDorso: string; // URI local de la foto (dorso)
}

let draft: RegisterDraft | null = null;

export function setRegisterDraft(value: RegisterDraft): void {
  draft = value;
}

export function getRegisterDraft(): RegisterDraft | null {
  return draft;
}

export function clearRegisterDraft(): void {
  draft = null;
}
