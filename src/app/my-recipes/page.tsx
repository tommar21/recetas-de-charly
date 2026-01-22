'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Plus, MoreVertical, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { RecipeCard } from '@/components/recipes/recipe-card'

interface Recipe {
  id: string
  title: string
  slug: string
  description: string | null
  image_url: string | null
  cooking_time: number | null
  servings: number | null
  difficulty: string | null
  created_at: string
  likes_count: number
}

// Raw type from Supabase query
interface RawRecipe {
  id: string
  title: string
  slug: string
  description: string | null
  image_url: string | null
  cooking_time: number | null
  servings: number | null
  difficulty: string | null
  created_at: string
  recipe_likes: { count: number }[]
}

export default function MyRecipesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadRecipes = useCallback(async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Debes iniciar sesion para ver tus recetas')
      router.push('/login')
      return
    }

    const { data: recipesData, error } = await supabase
      .from('recipes')
      .select('id, title, slug, description, image_url, cooking_time, servings, difficulty, created_at, recipe_likes(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Transform the data to include likes_count
    const rawRecipes = (recipesData || []) as unknown as RawRecipe[]
    const recipesWithLikes: Recipe[] = rawRecipes.map(recipe => ({
      id: recipe.id,
      title: recipe.title,
      slug: recipe.slug,
      description: recipe.description,
      image_url: recipe.image_url,
      cooking_time: recipe.cooking_time,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      created_at: recipe.created_at,
      likes_count: recipe.recipe_likes?.[0]?.count || 0
    }))

    if (error) {
      toast.error('Error al cargar tus recetas')
    } else {
      setRecipes(recipesWithLikes)
    }

    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    loadRecipes()
  }, [loadRecipes])

  const handleDelete = async () => {
    if (!supabase || !deleteId) return

    setDeleting(true)

    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', deleteId)

      if (error) throw error

      setRecipes(recipes.filter(r => r.id !== deleteId))
      toast.success('Receta eliminada')
    } catch {
      toast.error('Error al eliminar la receta')
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Mis Recetas</h1>
        <Button asChild>
          <Link href="/recipes/new">
            <Plus className="h-4 w-4 mr-1.5" />
            Nueva Receta
          </Link>
        </Button>
      </div>

      {recipes.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              actions={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 opacity-70 hover:opacity-100 focus:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm"
                      aria-label="Opciones de receta"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/recipes/${recipe.id}/edit`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteId(recipe.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-4xl mb-4">📝</p>
              <h3 className="text-xl font-semibold mb-2">No has creado recetas aun</h3>
              <p className="text-muted-foreground mb-6">
                Comparte tu primera receta con la comunidad
              </p>
              <Button asChild>
                <Link href="/recipes/new">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Crear mi primera receta
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar receta</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. La receta sera eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
