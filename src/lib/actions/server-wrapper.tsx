import { ServerActionsResults } from './client-results'
import type {
  ActionsMap,
  ServerActionsProps,
  ExtractDataFromActions,
  ActionError,
  ServerActionResult,
} from './types'

/**
 * Server Component that executes multiple server actions in parallel.
 * Processes results and passes them to ServerActionsResults for client-side error toasts.
 *
 * @example
 * // In a page.tsx (Server Component)
 * export default async function RecipePage({ params }: { params: Promise<{ slug: string }> }) {
 *   const { slug } = await params
 *
 *   return (
 *     <ServerActions
 *       actions={{
 *         recipe: {
 *           action: () => getRecipe(slug),
 *         },
 *         comments: {
 *           action: () => getComments(slug),
 *           defaultValue: [],
 *         },
 *         related: {
 *           action: () => getRelatedRecipes(slug),
 *           defaultValue: [],
 *         },
 *       }}
 *     >
 *       {(data, { errors }) => (
 *         <RecipeDetail
 *           recipe={data.recipe}
 *           comments={data.comments}
 *           related={data.related}
 *           hasErrors={Object.values(errors).some(Boolean)}
 *         />
 *       )}
 *     </ServerActions>
 *   )
 * }
 */
export async function ServerActions<TActions extends ActionsMap>({
  searchParams,
  actions,
  children,
}: ServerActionsProps<TActions>) {
  // Resolve searchParams Promise if provided
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  // Store results and defaults for each action
  const results: Record<string, ServerActionResult<unknown>> = {}
  const defaults: Partial<ExtractDataFromActions<TActions>> = {}

  // Execute all actions in parallel and collect results/defaults
  await Promise.all(
    Object.entries(actions).map(async ([key, config]) => {
      const result = await config.action(resolvedSearchParams)
      results[key] = result

      if (config.defaultValue !== undefined && config.defaultValue !== null) {
        (defaults as Record<string, unknown>)[key] = config.defaultValue
      }
    }),
  )

  type ActionsData = ExtractDataFromActions<TActions>

  // Process results into data object with defaults applied
  const processedData: ActionsData = {} as ActionsData
  const processedErrors: Record<string, ActionError | null> = {}

  for (const key in results) {
    const result = results[key]
    const defaultValue = defaults?.[key]
    processedData[key as keyof ActionsData] = (
      result.success ? (result.data ?? defaultValue) : defaultValue
    ) as ActionsData[keyof ActionsData]

    processedErrors[key] = result.success
      ? null
      : {
          error: result.error || 'Unknown error',
          errorCode: result.errorCode,
          statusCode: result.statusCode,
        }
  }

  // Render children on server with processed data
  const renderedChildren = children(processedData, {
    errors: processedErrors,
    resolvedSearchParams,
  })

  // Pass results to client component for error toast notifications
  return (
    <ServerActionsResults results={results}>
      {renderedChildren}
    </ServerActionsResults>
  )
}
