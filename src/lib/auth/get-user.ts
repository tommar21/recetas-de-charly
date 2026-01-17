import { createClient } from '@/lib/supabase/server'

export interface AuthUser {
  id: string
  email: string
  display_name?: string
  avatar_url?: string
}

/**
 * Gets the current authenticated user with profile data
 * For use in Server Components only
 */
export async function getUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  if (!supabase) return null

  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', authUser.id)
      .single()

    return {
      id: authUser.id,
      email: authUser.email || '',
      display_name: profile?.display_name || undefined,
      avatar_url: profile?.avatar_url || undefined,
    }
  } catch {
    return null
  }
}
