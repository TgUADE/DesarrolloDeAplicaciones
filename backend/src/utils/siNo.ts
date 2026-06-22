/**
 * Conversión entre el boolean del dominio de la app y el varchar(2) 'si'/'no'
 * que guardan las tablas core (estructura legacy de EstructuraActual.sql).
 *
 * - `toSiNo`  se usa al ESCRIBIR en la BD (boolean -> 'si'/'no').
 * - `fromSiNo` se usa al LEER desde la BD (en los mappers de respuesta), para
 *   que la API siga exponiendo booleans y los frontends no cambien.
 */

export type SiNo = 'si' | 'no';

export function toSiNo(value?: boolean | null): SiNo | null {
  if (value == null) return null;
  return value ? 'si' : 'no';
}

export function fromSiNo(value?: string | null): boolean {
  return value === 'si';
}
