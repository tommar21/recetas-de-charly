'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { AuthUser } from './get-user'

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  refreshUser: async () => {},
})

interface AuthProviderProps {
  initialUser: AuthUser | null
  children: React.ReactNode
}

export function AuthProvider({ initialUser, children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  // Fetch user with profile data
  const fetchUserWithProfile = useCallback(async (userId: string, email: string): Promise<AuthUser | null> => {
    if (!supabase) return null

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', userId)
        .single()

      return {
        id: userId,
        email,
        display_name: profile?.display_name || undefined,
        avatar_url: profile?.avatar_url || undefined,
      }
    } catch {
      return {
        id: userId,
        email,
      }
    }
  }, [supabase])

  const refreshUser = useCallback(async () => {
    if (!supabase) return
    setIsLoading(true)

    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (authUser) {
      const userWithProfile = await fetchUserWithProfile(authUser.id, authUser.email || '')
      setUser(userWithProfile)
    } else {
      setUser(null)
    }

    setIsLoading(false)
  }, [supabase, fetchUserWithProfile])

  // Listen for auth state changes
  useEffect(() => {
    if (!supabase) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            const userWithProfile = await fetchUserWithProfile(
              session.user.id,
              session.user.email || ''
            )
            setUser(userWithProfile)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchUserWithProfile])

  // Sync with initialUser when it changes (e.g., after navigation)
  useEffect(() => {
    setUser(initialUser)
  }, [initialUser])

  return (
    <AuthContext.Provider value={{ user, isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Type guard for checking if user is authenticated
export function useRequireAuth() {
  const { user, isLoading } = useAuth()
  return { user, isLoading, isAuthenticated: !!user }
}
