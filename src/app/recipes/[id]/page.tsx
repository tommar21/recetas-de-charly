import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Clock,
  Users,
  ExternalLink,
  ArrowLeft,
  Tag,
} from 'lucide-react'
import { BookmarkButton } from '@/components/recipes/bookmark-button'
import { LikeButton } from '@/components/recipes/like-button'
import { ServingsScaler } from '@/components/recipes/servings-scaler'
import { CookingMode } from '@/components/recipes/cooking-mode'
import { RecipeNotes } from '@/components/recipes/recipe-notes'
import { createClient } from '@/lib/supabase/server'
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '@/lib/constants'

interface TagInfo {
  name: string
  color: string | null
}

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
  imported_from: string | null
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
  tags: TagInfo[]
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

interface TagJoin {
  name: string
  color: string | null
}

interface RecipeTagRow {
  tags: TagJoin | null
}


async function getRecipeById(id: string): Promise<FormattedRecipe | null> {
  const supabase = await createClient()
  if (!supabase) return null

  // Single query with all JOINs - optimized from 4 queries to 1
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select(`
      *,
      profiles:user_id (
        display_name,
        avatar_url
      ),
      recipe_ingredients (
        quantity,
        unit,
        order_index,
        ingredients (
          name
        )
      ),
      instructions (
        step_number,
        content
      ),
      recipe_categories (
        categories (
          name,
          icon
        )
      ),
      recipe_tags (
        tags (
          name,
          color
        )
      )
    `)
    .eq('id', id)
    .eq('is_public', true)
    .single()

  if (error || !recipe) return null

  // Format ingredients with proper typing
  const typedIngredients = recipe.recipe_ingredients as RecipeIngredientRow[] | null
  const sortedIngredients = (typedIngredients || [])
    .sort((a, b) => a.order_index - b.order_index)
  const formattedIngredients = sortedIngredients.map((ri) => ({
    quantity: ri.quantity,
    unit: ri.unit || '',
    name: ri.ingredients?.name || '',
  }))

  // Format instructions - sort by step_number
  const typedInstructions = recipe.instructions as { step_number: number; content: string }[] | null
  const sortedInstructions = (typedInstructions || [])
    .sort((a, b) => a.step_number - b.step_number)
    .map((i) => i.content)

  // Format categories with proper typing
  const typedCategories = recipe.recipe_categories as RecipeCategoryRow[] | null
  const categories = (typedCategories || [])
    .map((rc) => rc.categories?.name || '')
    .filter(Boolean)

  // Format tags with proper typing
  const typedTags = recipe.recipe_tags as RecipeTagRow[] | null
  const tags = (typedTags || [])
    .map((rt) => rt.tags)
    .filter((tag): tag is TagJoin => tag !== null)

  // Get profile data with proper typing
  const profile = recipe.profiles as ProfileJoin | null

  return {
    ...recipe,
    author: {
      name: profile?.display_name || 'Usuario',
      avatar: profile?.avatar_url || null,
    },
    ingredients: formattedIngredients,
    instructions: sortedInstructions,
    categories,
    tags,
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
          <Image
            src={recipe.image_url}
            alt={recipe.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-6xl">🍽️</span>
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />

        {/* Action buttons in hero overlay */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10 flex gap-2">
          <LikeButton
            recipeId={recipe.id}
            variant="icon"
            className="bg-background/80 backdrop-blur-sm hover:bg-background shadow-lg h-10 w-10"
          />
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
                <Image
                  src={recipe.author.avatar}
                  alt={recipe.author.name}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
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

            {/* Imported from attribution */}
            {recipe.imported_from && (
              <p className="text-sm text-muted-foreground italic">
                Importada de: {recipe.imported_from}
              </p>
            )}

            <Separator />

            {/* Instructions */}
            {recipe.instructions.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Instrucciones</h2>

                {/* Cooking Mode Toggle */}
                <div className="mb-6">
                  <CookingMode instructions={recipe.instructions} />
                </div>

                {/* Static instructions list */}
                <ol className="space-y-6">
                  {recipe.instructions.map((step, index) => (
                    <li key={index} className="flex gap-4">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
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

            {/* Personal Notes */}
            <div className="pt-4">
              <RecipeNotes recipeId={recipe.id} />
            </div>
          </div>

          {/* Sidebar - Ingredients */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <ServingsScaler
                originalServings={recipe.servings || 1}
                ingredients={recipe.ingredients}
              />

              {recipe.categories.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-6">
                  <h3 className="font-medium mb-3">Categorias</h3>
                  <div className="flex flex-wrap gap-2">
                    {recipe.categories.map((category) => (
                      <Badge key={category} variant="secondary">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {recipe.tags.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="h-4 w-4" />
                    <h3 className="font-medium">Etiquetas</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recipe.tags.map((tag) => (
                      <Badge
                        key={tag.name}
                        variant="outline"
                        style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
