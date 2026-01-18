'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Bookmark, Loader2 } from 'lucide-react'
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
  const [isChecking, setIsChecking] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  const checkBookmarkStatus = useCallback(async () => {
    if (!supabase) {
      setIsChecking(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!isMounted.current) return

    if (!user) {
      setIsChecking(false)
      return
    }

    setUserId(user.id)

    const { data } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('recipe_id', recipeId)
      .maybeSingle()

    if (!isMounted.current) return
    setIsBookmarked(!!data)
    setIsChecking(false)
  }, [supabase, recipeId])

  useEffect(() => {
    checkBookmarkStatus()
  }, [checkBookmarkStatus])

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
        if (isMounted.current) toast.success('Receta eliminada de guardados')
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('bookmarks')
          .insert({
            user_id: userId,
            recipe_id: recipeId,
          })

        if (error) throw error
        if (isMounted.current) toast.success('Receta guardada')
      }
    } catch {
      // Revert optimistic update on error
      if (isMounted.current) {
        setIsBookmarked(previousState)
        toast.error('Error al actualizar guardados')
      }
    } finally {
      if (isMounted.current) setIsLoading(false)
    }
  }

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggleBookmark}
        disabled={isLoading || isChecking}
        className={cn(
          'transition-colors',
          isBookmarked && 'text-primary',
          className
        )}
        title={isBookmarked ? 'Quitar de guardados' : 'Guardar receta'}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Bookmark
            className={cn('h-5 w-5', isBookmarked && 'fill-current')}
          />
        )}
      </Button>
    )
  }

  return (
    <Button
      variant={isBookmarked ? 'default' : 'outline'}
      onClick={handleToggleBookmark}
      disabled={isLoading || isChecking}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Bookmark
          className={cn('h-4 w-4 mr-2', isBookmarked && 'fill-current')}
        />
      )}
      {isBookmarked ? 'Guardada' : 'Guardar'}
    </Button>
  )
}
