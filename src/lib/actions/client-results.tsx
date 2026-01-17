'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import type { ServerActionsResultsProps } from './types'
import { getErrorMessage } from '@/lib/constants'

/**
 * Client component that shows toast notifications for failed server actions.
 * Children are already rendered on server with processed data.
 *
 * This component only handles the client-side effect of showing error toasts.
 * The actual data processing happens in the ServerActions server component.
 */
export function ServerActionsResults({
  results,
  children,
}: ServerActionsResultsProps) {
  // Show toast notifications for failed actions
  useEffect(() => {
    for (const result of Object.values(results)) {
      if (!result.success) {
        const errorMessage = getErrorMessage(result.error, result.errorCode)
        toast.error(errorMessage)
      }
    }
  }, [results])

  return <>{children}</>
}
