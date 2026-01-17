'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock, Users, Bookmark, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS, type Difficulty } from '@/lib/constants'

interface BookmarkedRecipe {
  id: string
  recipe: {
    id: string
    title: string
    slug: string
    description: string | null
    image_url: string | null
    cooking_time: number | null
    servings: number | null
    difficulty: string | null
  }
}

export default function BookmarksPage() {
  const router = useRouter()
  const supabase = createClient()
  const [bookmarks, setBookmarks] = useState<BookmarkedRecipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadBookmarks() {
      if (!supabase) {
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('Debes iniciar sesion para ver tus guardados')
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('bookmarks')
        .select(`
          id,
          recipe:recipes (
            id,
            title,
            slug,
            description,
            image_url,
            cooking_time,
            servings,
            difficulty
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        toast.error('Error al cargar los guardados')
      } else {
        setBookmarks((data || []) as unknown as BookmarkedRecipe[])
      }

      setLoading(false)
    }

    loadBookmarks()
  }, [supabase, router])

  const removeBookmark = async (bookmarkId: string) => {
    if (!supabase) return

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', bookmarkId)

    if (error) {
      toast.error('Error al eliminar el guardado')
    } else {
      setBookmarks(bookmarks.filter((b) => b.id !== bookmarkId))
      toast.success('Receta eliminada de guardados')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-[4/3]" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <Bookmark className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Mis Guardados</h1>
          <p className="text-muted-foreground">
            Recetas que has guardado para ver despues
          </p>
        </div>
      </div>

      {bookmarks.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookmarks.map((bookmark) => {
            const recipe = bookmark.recipe
            const difficulty = recipe.difficulty as Difficulty | null

            return (
              <Card key={bookmark.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <Link href={`/recipes/${recipe.id}`}>
                    <div className="aspect-[4/3] overflow-hidden">
                      {recipe.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={recipe.image_url}
                          alt={recipe.title}
                          className="object-cover w-full h-full transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-4xl">🍽️</span>
                        </div>
                      )}
                    </div>
                  </Link>
                  {difficulty && (
                    <Badge
                      className={`absolute top-2 left-2 ${DIFFICULTY_COLORS[difficulty]}`}
                      variant="secondary"
                    >
                      {DIFFICULTY_LABELS[difficulty]}
                    </Badge>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeBookmark(bookmark.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardContent className="p-4">
                  <Link href={`/recipes/${recipe.id}`}>
                    <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                      {recipe.title}
                    </h3>
                  </Link>
                  {recipe.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {recipe.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    {recipe.cooking_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{recipe.cooking_time} min</span>
                      </div>
                    )}
                    {recipe.servings && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{recipe.servings}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-4xl mb-4">📚</p>
          <h3 className="text-xl font-semibold mb-2">No tienes recetas guardadas</h3>
          <p className="text-muted-foreground mb-6">
            Guarda recetas haciendo clic en el icono de marcador
          </p>
          <Button asChild>
            <Link href="/recipes">Explorar recetas</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
