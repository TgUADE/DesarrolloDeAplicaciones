/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base del backend (sin `/api`), ej. https://api.subastar.com. Si no se define, usa localhost. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
