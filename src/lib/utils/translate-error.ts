// Common Supabase/Auth error translations to Spanish
const errorTranslations: Record<string, string> = {
  // Auth errors
  'Invalid login credentials': 'Email o contrasena incorrectos',
  'Email not confirmed': 'Email no confirmado. Revisa tu bandeja de entrada',
  'User already registered': 'Este email ya esta registrado',
  'Password should be at least 6 characters': 'La contrasena debe tener al menos 6 caracteres',
  'Unable to validate email address: invalid format': 'El formato del email no es valido',
  'Signup requires a valid password': 'Ingresa una contrasena valida',
  'User not found': 'Usuario no encontrado',
  'Email rate limit exceeded': 'Demasiados intentos. Espera unos minutos',
  'For security purposes, you can only request this once every 60 seconds': 'Por seguridad, espera 60 segundos antes de intentar de nuevo',
  'Token has expired or is invalid': 'El enlace ha expirado o es invalido',
  'New password should be different from the old password': 'La nueva contrasena debe ser diferente a la anterior',
  'Auth session missing!': 'Sesion expirada. Inicia sesion de nuevo',

  // Database errors
  'duplicate key value violates unique constraint': 'Este registro ya existe',
  'violates foreign key constraint': 'No se puede eliminar porque tiene datos relacionados',
  'null value in column': 'Falta un campo requerido',
  'value too long for type': 'El texto es demasiado largo',
  'invalid input syntax': 'Formato de datos invalido',

  // Storage errors
  'The resource already exists': 'El archivo ya existe',
  'Bucket not found': 'Error de configuracion del servidor',
  'Object not found': 'Archivo no encontrado',
  'Payload too large': 'El archivo es demasiado grande',
  'Invalid key': 'Nombre de archivo invalido',
  'Permission denied': 'No tienes permiso para esta accion',

  // Network errors
  'Failed to fetch': 'Error de conexion. Verifica tu internet',
  'NetworkError': 'Error de red. Intenta de nuevo',
  'TypeError: Failed to fetch': 'No se pudo conectar al servidor',

  // Generic
  'Internal Server Error': 'Error del servidor. Intenta mas tarde',
  'Service Unavailable': 'Servicio no disponible. Intenta mas tarde',
  'Bad Request': 'Solicitud invalida',
  'Unauthorized': 'No autorizado',
  'Forbidden': 'Acceso denegado',
  'Not Found': 'No encontrado',
  'Request Timeout': 'La solicitud tardo demasiado',
  'Too Many Requests': 'Demasiadas solicitudes. Espera un momento',
}

/**
 * Translates Supabase/Auth error messages to Spanish
 * Falls back to the original message if no translation is found
 */
export function translateError(error: Error | string | unknown): string {
  const message = error instanceof Error ? error.message : String(error || '')

  // Check for exact match first
  if (errorTranslations[message]) {
    return errorTranslations[message]
  }

  // Check for partial matches (for errors that include variable content)
  for (const [pattern, translation] of Object.entries(errorTranslations)) {
    if (message.toLowerCase().includes(pattern.toLowerCase())) {
      return translation
    }
  }

  // Return original message if no translation found
  // But clean up some common patterns
  if (message.startsWith('AuthApiError:')) {
    return message.replace('AuthApiError:', '').trim()
  }

  if (message.startsWith('PostgrestError:')) {
    return 'Error en la base de datos'
  }

  if (message.startsWith('StorageError:')) {
    return 'Error al procesar el archivo'
  }

  return message || 'Ha ocurrido un error'
}

/**
 * Shorthand for translateError + toast.error
 * Usage: import { toastError } from '@/lib/utils/translate-error'
 *        toastError(error)
 */
export { translateError as te }
