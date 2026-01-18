'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Heart, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface LikeButtonProps {
  recipeId: string
  initialLiked?: boolean
  initialCount?: number
  variant?: 'default' | 'icon' | 'minimal'
  showCount?: boolean
  className?: string
}

export function LikeButton({
  recipeId,
  initialLiked = false,
  initialCount = 0,
  variant = 'default',
  showCount = true,
  className,
}: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(initialCount)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  const checkLikeStatus = useCallback(async () => {
    if (!supabase) {
      setIsChecking(false)
      return
    }

    // Get like count regardless of auth status
    const { count } = await supabase
      .from('recipe_likes')
      .select('*', { count: 'exact', head: true })
      .eq('recipe_id', recipeId)

    if (!isMounted.current) return
    setLikeCount(count || 0)

    // Check if current user has liked
    const { data: { user } } = await supabase.auth.getUser()
    if (!isMounted.current) return

    if (!user) {
      setIsChecking(false)
      return
    }

    setUserId(user.id)

    const { data } = await supabase
      .from('recipe_likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('recipe_id', recipeId)
      .maybeSingle()

    if (!isMounted.current) return
    setIsLiked(!!data)
    setIsChecking(false)
  }, [supabase, recipeId])

  useEffect(() => {
    checkLikeStatus()
  }, [checkLikeStatus])

  const handleToggleLike = async () => {
    if (!supabase) {
      toast.error('Error de conexion')
      return
    }

    if (!userId) {
      toast.error('Debes iniciar sesion para dar like')
      return
    }

    if (isLoading) return

    setIsLoading(true)
    const previousState = isLiked
    const previousCount = likeCount

    // Optimistic update
    setIsLiked(!isLiked)
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1)

    try {
      if (previousState) {
        // Remove like
        const { error } = await supabase
          .from('recipe_likes')
          .delete()
          .eq('user_id', userId)
          .eq('recipe_id', recipeId)

        if (error) throw error
      } else {
        // Add like
        const { error } = await supabase
          .from('recipe_likes')
          .insert({
            user_id: userId,
            recipe_id: recipeId,
          })

        if (error) throw error
      }
    } catch {
      // Revert optimistic update on error
      if (isMounted.current) {
        setIsLiked(previousState)
        setLikeCount(previousCount)
        toast.error('Error al actualizar like')
      }
    } finally {
      if (isMounted.current) setIsLoading(false)
    }
  }

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`
    }
    return count.toString()
  }

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggleLike}
        disabled={isLoading || isChecking}
        className={cn(
          'transition-colors',
          isLiked && 'text-red-500',
          className
        )}
        title={isLiked ? 'Quitar like' : 'Dar like'}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Heart
            className={cn('h-5 w-5', isLiked && 'fill-current')}
          />
        )}
      </Button>
    )
  }

  if (variant === 'minimal') {
    return (
      <button
        onClick={handleToggleLike}
        disabled={isLoading || isChecking}
        className={cn(
          'flex items-center gap-1 text-sm text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50',
          isLiked && 'text-red-500',
          className
        )}
        title={isLiked ? 'Quitar like' : 'Dar like'}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Heart
            className={cn('h-4 w-4', isLiked && 'fill-current')}
          />
        )}
        {showCount && <span>{formatCount(likeCount)}</span>}
      </button>
    )
  }

  return (
    <Button
      variant={isLiked ? 'default' : 'outline'}
      onClick={handleToggleLike}
      disabled={isLoading || isChecking}
      className={cn(
        isLiked && 'bg-red-500 hover:bg-red-600 border-red-500',
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Heart
          className={cn('h-4 w-4 mr-2', isLiked && 'fill-current')}
        />
      )}
      {showCount ? formatCount(likeCount) : (isLiked ? 'Te gusta' : 'Me gusta')}
    </Button>
  )
}
