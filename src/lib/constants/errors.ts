/**
 * Map of error codes to user-friendly messages in Spanish
 */
export const ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'No se encontro el recurso solicitado',
  UNAUTHORIZED: 'No tienes permiso para realizar esta accion',
  FORBIDDEN: 'Acceso denegado',
  VALIDATION_ERROR: 'Los datos proporcionados no son validos',
  NETWORK_ERROR: 'Error de conexion. Verifica tu internet',
  SERVER_ERROR: 'Error del servidor. Intenta de nuevo mas tarde',
  UNKNOWN: 'Ocurrio un error inesperado',
}

/**
 * Get user-friendly error message from error code
 */
export function getErrorMessage(error: string, errorCode?: string): string {
  if (errorCode && ERROR_MESSAGES[errorCode]) {
    return ERROR_MESSAGES[errorCode]
  }
  return error || ERROR_MESSAGES.UNKNOWN
}
