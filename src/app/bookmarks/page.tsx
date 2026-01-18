'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Bookmark, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { RecipeCard } from '@/components/recipes/recipe-card'

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
  const [deleteBookmarkId, setDeleteBookmarkId] = useState<string | null>(null)

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

  const confirmRemoveBookmark = async () => {
    if (!supabase || !deleteBookmarkId) return

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', deleteBookmarkId)

    if (error) {
      toast.error('Error al eliminar el guardado')
    } else {
      setBookmarks(bookmarks.filter((b) => b.id !== deleteBookmarkId))
      toast.success('Receta eliminada de guardados')
    }
    setDeleteBookmarkId(null)
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
              <Skeleton className="aspect-4/3" />
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
          {bookmarks.map((bookmark) => (
            <RecipeCard
              key={bookmark.id}
              recipe={bookmark.recipe}
              actions={
                <Button
                  variant="destructive"
                  size="icon"
                  className="opacity-70 hover:opacity-100 focus:opacity-100 transition-opacity"
                  onClick={() => setDeleteBookmarkId(bookmark.id)}
                  aria-label="Eliminar de guardados"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            />
          ))}
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

      <AlertDialog open={!!deleteBookmarkId} onOpenChange={(open) => !open && setDeleteBookmarkId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar de guardados</AlertDialogTitle>
            <AlertDialogDescription>
              Esta receta sera eliminada de tus guardados. Puedes volver a guardarla cuando quieras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveBookmark}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
