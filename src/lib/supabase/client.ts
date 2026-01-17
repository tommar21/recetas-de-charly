'use client'

import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/utils'

// Singleton instance - prevents creating new client on every render
let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!env.supabase.isConfigured) {
    return null
  }

  // Return existing instance if already created
  if (!browserClient) {
    browserClient = createBrowserClient(env.supabase.url!, env.supabase.key!)
  }

  return browserClient
}
