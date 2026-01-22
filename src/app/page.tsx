export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ChefHat,
  Search,
  Bookmark,
  Sparkles,
  ArrowRight,
  Plus
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { RecipeCard } from '@/components/recipes/recipe-card'
import { getUser } from '@/lib/auth/get-user'
import type { Category, Recipe } from '@/lib/types'

async function getCategories(): Promise<Category[]> {
  const supabase = await createClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  if (error) {
    return []
  }

  return data || []
}

async function getFeaturedRecipes(): Promise<(Recipe & { likes_count: number })[]> {
  const supabase = await createClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(6)

  if (error) {
    return []
  }

  return (data || []).map(recipe => ({ ...recipe, likes_count: 0 }))
}

async function getCategoryCounts(): Promise<Record<string, number>> {
  const supabase = await createClient()
  if (!supabase) return {}

  // Join with recipes to only count public recipes
  // Note: For better performance at scale, create a DB function with GROUP BY
  const { data, error } = await supabase
    .from('recipe_categories')
    .select('category_id, recipes!inner(is_public)')
    .eq('recipes.is_public', true)

  if (error) return {}

  const counts: Record<string, number> = {}
  data?.forEach(item => {
    counts[item.category_id] = (counts[item.category_id] || 0) + 1
  })

  return counts
}

export default async function HomePage() {
  const [categories, featuredRecipes, categoryCounts, user] = await Promise.all([
    getCategories(),
    getFeaturedRecipes(),
    getCategoryCounts(),
    getUser()
  ])

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-linear-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950 dark:via-amber-950 dark:to-yellow-950">
        <div className="container mx-auto max-w-7xl px-4 py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="h-3 w-3 mr-1" />
              Nueva version disponible
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Descubre el placer de{' '}
              <span className="text-primary">cocinar</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Encuentra recetas deliciosas, guarda tus favoritas y comparte tus
              creaciones culinarias con nuestra comunidad.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/recipes">
                  <Search className="mr-2 h-5 w-5" />
                  Explorar Recetas
                </Link>
              </Button>
              {user ? (
                <Button size="lg" variant="outline" asChild>
                  <Link href="/recipes/new">
                    <Plus className="mr-2 h-5 w-5" />
                    Crear Nueva Receta
                  </Link>
                </Button>
              ) : (
                <Button size="lg" variant="outline" asChild>
                  <Link href="/register">
                    Crear Cuenta Gratis
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-none shadow-none bg-transparent">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Busca Recetas</h3>
                <p className="text-muted-foreground">
                  Encuentra recetas por ingredientes, tiempo de preparacion o
                  dificultad.
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-none bg-transparent">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Bookmark className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Guarda Favoritos</h3>
                <p className="text-muted-foreground">
                  Crea tu coleccion personal de recetas para acceder en
                  cualquier momento.
                </p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-none bg-transparent">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <ChefHat className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Comparte Recetas</h3>
                <p className="text-muted-foreground">
                  Publica tus propias recetas y comparte tu pasion con la
                  comunidad.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Categorias</h2>
              <p className="text-muted-foreground mt-1">
                Explora recetas por tipo de comida
              </p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/categories">
                Ver todas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.slice(0, 6).map((category) => (
              <Link key={category.slug} href={`/recipes?category=${category.slug}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <span className="text-4xl mb-2 block">{category.icon || '🍴'}</span>
                    <h3 className="font-medium">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {categoryCounts[category.id] || 0} recetas
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Recipes Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">
                Recetas Destacadas
              </h2>
              <p className="text-muted-foreground mt-1">
                Las mas populares de la comunidad
              </p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/recipes">
                Ver todas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {featuredRecipes.length === 0 ? (
            <div className="text-center py-12">
              <ChefHat className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aun no hay recetas</h3>
              <p className="text-muted-foreground mb-4">
                Se el primero en compartir una receta con la comunidad
              </p>
              <Button asChild>
                <Link href={user ? "/recipes/new" : "/register"}>
                  {user ? "Crear receta" : "Crear cuenta y publicar"}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} useIconPlaceholder />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section - Solo para usuarios no logueados */}
      {!user && (
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto max-w-7xl px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Unete a nuestra comunidad
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Crea una cuenta gratuita y comienza a guardar tus recetas favoritas,
              publicar las tuyas y conectar con otros amantes de la cocina.
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">Crear Cuenta Gratis</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
