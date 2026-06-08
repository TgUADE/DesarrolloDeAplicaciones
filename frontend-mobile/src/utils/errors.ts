export function getApiErrorMessage(error: any, fallback: string): string {
  const apiError = error?.response?.data?.error;
  if (apiError) return apiError;
  if (error?.message === 'Network Error' || !error?.response) {
    return 'No se pudo conectar con el servidor. Verificá tu conexión a internet o que el backend esté iniciado.';
  }
  return error?.message ?? fallback;
}

