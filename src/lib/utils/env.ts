/**
 * Supabase environment configuration
 * Validates and provides typed access to required environment variables
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export const env = {
  supabase: {
    url: supabaseUrl,
    key: supabaseKey,
    isConfigured: Boolean(supabaseUrl && supabaseKey),
  },
} as const

/**
 * Validates that required Supabase environment variables are set
 * Call this at app startup to fail fast if configuration is missing
 */
export function validateSupabaseEnv(): { url: string; key: string } | null {
  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[Supabase] Missing environment variables. ' +
        'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set in .env.local'
      )
    }
    return null
  }
  return { url: supabaseUrl, key: supabaseKey }
}
