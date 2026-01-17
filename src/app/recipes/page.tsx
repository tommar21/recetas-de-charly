import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Users, Plus, ChefHat } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Recipe, Category } from '@/lib/types'
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS, type Difficulty } from '@/lib/constants'

interface RecipeWithAuthor extends Recipe {
  profiles: { display_name: string | null } | null
}

async function getRecipes(categorySlug?: string): Promise<RecipeWithAuthor[]> {
  const supabase = await createClient()
  if (!supabase) return []

  let query = supabase
    .from('recipes')
    .select('*, profiles:user_id(display_name)')
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (categorySlug) {
    // Get category ID first
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .single()

    if (category) {
      const { data: recipeIds } = await supabase
        .from('recipe_categories')
        .select('recipe_id')
        .eq('category_id', category.id)

      if (recipeIds && recipeIds.length > 0) {
        query = query.in('id', recipeIds.map(r => r.recipe_id))
      } else {
        return []
      }
    }
  }

  const { data, error } = await query

  if (error) {
    return []
  }

  return (data || []) as RecipeWithAuthor[]
}

async function getCategories(): Promise<Category[]> {
  const supabase = await createClient()
  if (!supabase) return []

  const { data } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  return data || []
}

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const params = await searchParams
  const categorySlug = params.category

  const [recipes, categories] = await Promise.all([
    getRecipes(categorySlug),
    getCategories()
  ])

  const currentCategory = categorySlug
    ? categories.find(c => c.slug === categorySlug)
    : null

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            {currentCategory ? currentCategory.name : 'Todas las Recetas'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {currentCategory
              ? `Recetas de ${currentCategory.name.toLowerCase()}`
              : 'Explora nuestra coleccion de recetas deliciosas'}
          </p>
        </div>
        <Button asChild>
          <Link href="/recipes/new">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Receta
          </Link>
        </Button>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Link href="/recipes">
          <Badge
            variant={!categorySlug ? 'default' : 'outline'}
            className="cursor-pointer hover:bg-primary/90"
          >
            Todas
          </Badge>
        </Link>
        {categories.map((category) => (
          <Link key={category.id} href={`/recipes?category=${category.slug}`}>
            <Badge
              variant={categorySlug === category.slug ? 'default' : 'outline'}
              className="cursor-pointer hover:bg-primary/90"
            >
              {category.icon} {category.name}
            </Badge>
          </Link>
        ))}
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-16">
          <ChefHat className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No hay recetas todavia</h3>
          <p className="text-muted-foreground mb-4">
            {currentCategory
              ? `No hay recetas en la categoria ${currentCategory.name}`
              : 'Se el primero en compartir una receta'}
          </p>
          <Button asChild>
            <Link href="/recipes/new">
              <Plus className="mr-2 h-4 w-4" />
              Crear primera receta
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
              <Card className="group overflow-hidden hover:shadow-lg transition-shadow h-full">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {recipe.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={recipe.image_url}
                      alt={recipe.title}
                      className="object-cover w-full h-full transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ChefHat className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  {recipe.difficulty && (
                    <Badge
                      className={`absolute top-2 right-2 ${DIFFICULTY_COLORS[recipe.difficulty as Difficulty]}`}
                      variant="secondary"
                    >
                      {DIFFICULTY_LABELS[recipe.difficulty as Difficulty]}
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                    {recipe.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {recipe.description || 'Sin descripcion'}
                  </p>
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
                  {recipe.profiles?.display_name && (
                    <p className="text-xs text-muted-foreground mt-2">
                      por {recipe.profiles.display_name}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
