'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Bookmark } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface BookmarkButtonProps {
  recipeId: string
  initialBookmarked?: boolean
  variant?: 'default' | 'icon'
  className?: string
}

export function BookmarkButton({
  recipeId,
  initialBookmarked = false,
  variant = 'default',
  className,
}: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked)
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function checkBookmarkStatus() {
      if (!supabase) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      const { data } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('recipe_id', recipeId)
        .maybeSingle()

      setIsBookmarked(!!data)
    }

    checkBookmarkStatus()
  }, [supabase, recipeId])

  const handleToggleBookmark = async () => {
    if (!supabase) {
      toast.error('Error de conexion')
      return
    }

    if (!userId) {
      toast.error('Debes iniciar sesion para guardar recetas')
      return
    }

    // Prevent rapid clicks
    if (isLoading) return

    setIsLoading(true)
    const previousState = isBookmarked

    // Optimistic update
    setIsBookmarked(!isBookmarked)

    try {
      if (previousState) {
        // Remove bookmark
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', userId)
          .eq('recipe_id', recipeId)

        if (error) throw error
        toast.success('Receta eliminada de guardados')
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('bookmarks')
          .insert({
            user_id: userId,
            recipe_id: recipeId,
          })

        if (error) throw error
        toast.success('Receta guardada')
      }
    } catch {
      // Revert optimistic update on error
      setIsBookmarked(previousState)
      toast.error('Error al actualizar guardados')
    } finally {
      setIsLoading(false)
    }
  }

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggleBookmark}
        disabled={isLoading}
        className={cn(
          'transition-colors',
          isBookmarked && 'text-primary',
          className
        )}
        title={isBookmarked ? 'Quitar de guardados' : 'Guardar receta'}
      >
        <Bookmark
          className={cn('h-5 w-5', isBookmarked && 'fill-current')}
        />
      </Button>
    )
  }

  return (
    <Button
      variant={isBookmarked ? 'default' : 'outline'}
      onClick={handleToggleBookmark}
      disabled={isLoading}
      className={className}
    >
      <Bookmark
        className={cn('h-4 w-4 mr-2', isBookmarked && 'fill-current')}
      />
      {isBookmarked ? 'Guardada' : 'Guardar'}
    </Button>
  )
}
