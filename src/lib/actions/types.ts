import type { ReactNode } from 'react'

/**
 * Standard result type for all server actions
 * All server actions should return this type for consistent error handling
 */
export type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; errorCode?: string; statusCode?: number }

/**
 * Configuration for a single action in ServerActions component
 */
export interface ActionConfig<T> {
  /** The server action function to execute */
  action: (searchParams?: Record<string, string | string[] | undefined>) => Promise<ServerActionResult<T>>
  /** Default value to use if action fails */
  defaultValue?: T
}

/**
 * Map of action names to their configurations
 */
export type ActionsMap = Record<string, ActionConfig<unknown>>

/**
 * Error information for a failed action
 */
export interface ActionError {
  error: string
  errorCode?: string
  statusCode?: number
}

/**
 * Context passed to children render function
 */
export interface ServerActionsContext {
  errors: Record<string, ActionError | null>
  resolvedSearchParams?: Record<string, string | string[] | undefined>
}

/**
 * Extract data types from actions map
 */
export type ExtractDataFromActions<TActions extends ActionsMap> = {
  [K in keyof TActions]: TActions[K] extends ActionConfig<infer T> ? T : never
}

/**
 * Props for ServerActions component
 */
export interface ServerActionsProps<TActions extends ActionsMap> {
  /** Optional searchParams promise from Next.js page props */
  searchParams?: Promise<Record<string, string | string[] | undefined>>
  /** Map of actions to execute */
  actions: TActions
  /** Render function that receives processed data */
  children: (data: ExtractDataFromActions<TActions>, context: ServerActionsContext) => ReactNode
}

/**
 * Props for ServerActionsResults client component
 */
export interface ServerActionsResultsProps {
  results: Record<string, ServerActionResult<unknown>>
  children: ReactNode
}
