'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { RecipeForm } from '@/components/recipes/recipe-form'

export default function NewRecipePage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkAuth() {
      if (!supabase) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Debes iniciar sesion para crear recetas')
        router.push('/login')
      }
    }
    checkAuth()
  }, [supabase, router])

  return <RecipeForm mode="create" backUrl="/recipes" />
}
