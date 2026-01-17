'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import type { ServerActionResult } from '@/lib/actions'
import { getErrorMessage as baseGetErrorMessage } from '@/lib/constants'

/**
 * Get user-friendly error message from server action result
 */
function getErrorMessage(
  result: { error: string; errorCode?: string },
  customMessage?: string | null,
): string {
  if (customMessage) return customMessage
  return baseGetErrorMessage(result.error, result.errorCode)
}

interface ServerActionOptions<T = unknown> {
  /** Custom error message to show. Set to null to disable error toast */
  messageError?: string | null
  /** Success message to show */
  messageSuccess?: string
  /** Callback when action succeeds */
  onSuccess?: (data?: T, result?: ServerActionResult<T>) => void | Promise<void>
  /** Callback when action fails */
  onError?: (
    error: string,
    errorCode?: string,
    statusCode?: number,
    originalError?: string,
  ) => void | Promise<void>
  /** Callback that always runs after action completes */
  onFinally?: () => void | Promise<void>
}

interface UseServerActionReturn {
  /** Execute a server action with options */
  execute: <T>(
    action: () => Promise<ServerActionResult<T>>,
    options?: ServerActionOptions<T>,
  ) => Promise<boolean>
  /** Whether an action is currently being executed */
  isLoading: boolean
}

/**
 * Hook for executing server actions from client components.
 * Handles loading state, error/success toasts, and callbacks.
 *
 * @example
 * // Basic usage
 * const { execute, isLoading } = useServerAction()
 *
 * const handleDelete = async (id: string) => {
 *   const success = await execute(
 *     () => deleteRecipeAction(id),
 *     {
 *       messageSuccess: 'Receta eliminada!',
 *       onSuccess: () => router.push('/recipes'),
 *     }
 *   )
 * }
 *
 * @example
 * // With form
 * const { execute, isLoading } = useServerAction()
 *
 * const onSubmit = async (data: FormData) => {
 *   await execute(
 *     () => createRecipeAction(data),
 *     {
 *       messageSuccess: 'Receta creada!',
 *       messageError: 'No se pudo crear la receta',
 *       onSuccess: (recipe) => router.push(`/recipes/${recipe?.slug}`),
 *     }
 *   )
 * }
 *
 * @example
 * // Silent error handling (no toast)
 * await execute(
 *   () => someAction(),
 *   {
 *     messageError: null, // Disables error toast
 *     onError: (error) => setFormError(error),
 *   }
 * )
 */
export function useServerAction(): UseServerActionReturn {
  const [isLoading, setIsLoading] = useState(false)

  const execute = useCallback(async <T>(
    action: () => Promise<ServerActionResult<T>>,
    options: ServerActionOptions<T> = {},
  ): Promise<boolean> => {
    setIsLoading(true)

    try {
      const result = await action()

      if (!result.success) {
        const errorMessage = getErrorMessage(result, options.messageError)

        // Show error toast unless explicitly disabled
        if (options.messageError !== null) {
          toast.error(errorMessage)
        }

        await options.onError?.(
          errorMessage,
          result.errorCode,
          result.statusCode,
          result.error,
        )

        return false
      }

      // Show success toast if message provided
      if (options.messageSuccess) {
        toast.success(options.messageSuccess)
      }

      await options.onSuccess?.(result.data, result)
      return true
    } catch (error) {
      const errorMessage = options.messageError ?? 'Ocurrio un error inesperado'

      if (options.messageError !== null) {
        toast.error(errorMessage)
      }

      await options.onError?.(errorMessage, 'UNKNOWN', 500, String(error))
      return false
    } finally {
      setIsLoading(false)
      await options.onFinally?.()
    }
  }, [])

  return { execute, isLoading }
}
