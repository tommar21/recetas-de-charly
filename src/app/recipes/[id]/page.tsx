import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Clock,
  Users,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react'
import { BookmarkButton } from '@/components/recipes/bookmark-button'
import { createClient } from '@/lib/supabase/server'
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '@/lib/constants'

interface FormattedRecipe {
  id: string
  title: string
  slug: string
  description: string | null
  image_url: string | null
  cooking_time: number | null
  prep_time: number | null
  servings: number | null
  difficulty: string | null
  source_url: string | null
  author: {
    name: string
    avatar: string | null
  }
  ingredients: {
    quantity: number | null
    unit: string
    name: string
  }[]
  instructions: string[]
  categories: string[]
}

// Types for Supabase joined queries
interface ProfileJoin {
  display_name: string | null
  avatar_url: string | null
}

interface IngredientJoin {
  name: string
}

interface CategoryJoin {
  name: string
  icon: string | null
}

interface RecipeIngredientRow {
  quantity: number | null
  unit: string | null
  order_index: number
  ingredients: IngredientJoin | null
}

interface RecipeCategoryRow {
  categories: CategoryJoin | null
}


async function getRecipeById(id: string): Promise<FormattedRecipe | null> {
  const supabase = await createClient()
  if (!supabase) return null

  // Fetch recipe with author profile by ID
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select(`
      *,
      profiles:user_id (
        display_name,
        avatar_url
      )
    `)
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (error || !recipe) return null

  // Fetch ingredients
  const { data: recipeIngredients } = await supabase
    .from('recipe_ingredients')
    .select(`
      quantity,
      unit,
      order_index,
      ingredients (
        name
      )
    `)
    .eq('recipe_id', recipe.id)
    .order('order_index')

  // Fetch instructions
  const { data: instructions } = await supabase
    .from('instructions')
    .select('step_number, content')
    .eq('recipe_id', recipe.id)
    .order('step_number')

  // Fetch categories
  const { data: recipeCategories } = await supabase
    .from('recipe_categories')
    .select(`
      categories (
        name,
        icon
      )
    `)
    .eq('recipe_id', recipe.id)

  // Format ingredients with proper typing
  const typedIngredients = recipeIngredients as RecipeIngredientRow[] | null
  const formattedIngredients = (typedIngredients || []).map((ri) => ({
    quantity: ri.quantity,
    unit: ri.unit || '',
    name: ri.ingredients?.name || '',
  }))

  // Format categories with proper typing
  const typedCategories = recipeCategories as RecipeCategoryRow[] | null
  const categories = (typedCategories || [])
    .map((rc) => rc.categories?.name || '')
    .filter(Boolean)

  // Get profile data with proper typing
  const profile = recipe.profiles as ProfileJoin | null

  return {
    ...recipe,
    author: {
      name: profile?.display_name || 'Usuario',
      avatar: profile?.avatar_url || null,
    },
    ingredients: formattedIngredients,
    instructions: (instructions || []).map((i) => i.content),
    categories,
  }
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const recipe = await getRecipeById(id)

  if (!recipe) {
    notFound()
  }

  const difficulty = (recipe.difficulty as 'easy' | 'medium' | 'hard') || 'medium'

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Image */}
      <div className="relative h-[40vh] md:h-[50vh] overflow-hidden">
        {recipe.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-6xl">🍽️</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Bookmark button in hero overlay */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10">
          <BookmarkButton
            recipeId={recipe.id}
            variant="icon"
            className="bg-background/80 backdrop-blur-sm hover:bg-background shadow-lg h-10 w-10"
          />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="container">
            <Link
              href="/recipes"
              className="inline-flex items-center text-white/80 hover:text-white mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a recetas
            </Link>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
              {recipe.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-white/90">
              {recipe.difficulty && (
                <Badge
                  className={DIFFICULTY_COLORS[difficulty]}
                  variant="secondary"
                >
                  {DIFFICULTY_LABELS[difficulty]}
                </Badge>
              )}
              {recipe.cooking_time && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{recipe.cooking_time} min</span>
                </div>
              )}
              {recipe.servings && (
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{recipe.servings} porciones</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {recipe.description && (
              <div>
                <p className="text-lg text-muted-foreground">{recipe.description}</p>
              </div>
            )}

            {/* Author */}
            <div className="flex items-center gap-3">
              {recipe.author.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={recipe.author.avatar}
                  alt={recipe.author.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-medium">
                    {recipe.author.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="font-medium">{recipe.author.name}</p>
                <p className="text-sm text-muted-foreground">Autor de la receta</p>
              </div>
            </div>

            <Separator />

            {/* Instructions */}
            {recipe.instructions.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Instrucciones</h2>
                <ol className="space-y-6">
                  {recipe.instructions.map((step, index) => (
                    <li key={index} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <p className="pt-1">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Source */}
            {recipe.source_url && (
              <div className="pt-4">
                <Button variant="outline" asChild>
                  <a href={recipe.source_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver receta original
                  </a>
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar - Ingredients */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-muted/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Ingredientes</h2>
                {recipe.servings && (
                  <span className="text-sm text-muted-foreground">
                    {recipe.servings} porciones
                  </span>
                )}
              </div>
              {recipe.ingredients.length > 0 ? (
                <ul className="space-y-3">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>
                        {ingredient.quantity && (
                          <span className="font-medium">
                            {ingredient.quantity} {ingredient.unit}{' '}
                          </span>
                        )}
                        {ingredient.name}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No hay ingredientes listados
                </p>
              )}

              {recipe.categories.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h3 className="font-medium mb-3">Categorias</h3>
                    <div className="flex flex-wrap gap-2">
                      {recipe.categories.map((category) => (
                        <Badge key={category} variant="secondary">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
