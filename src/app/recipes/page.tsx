import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, ChefHat } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Recipe, Category } from '@/lib/types'
import { RecipeCard } from '@/components/recipes/recipe-card'
import { Pagination } from '@/components/ui/pagination'

const RECIPES_PER_PAGE = 12

interface RecipeWithAuthor extends Recipe {
  profiles: { display_name: string | null } | null
}

interface PaginatedResult {
  recipes: RecipeWithAuthor[]
  totalCount: number
  totalPages: number
  currentPage: number
}

async function getRecipes(categorySlug?: string, page = 1): Promise<PaginatedResult> {
  const supabase = await createClient()
  const emptyResult: PaginatedResult = { recipes: [], totalCount: 0, totalPages: 0, currentPage: page }
  if (!supabase) return emptyResult

  // Ensure page is valid
  const currentPage = Math.max(1, page)
  const from = (currentPage - 1) * RECIPES_PER_PAGE
  const to = from + RECIPES_PER_PAGE - 1

  // Get recipe IDs for category filter if needed
  let categoryRecipeIds: string[] | null = null
  if (categorySlug) {
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
        categoryRecipeIds = recipeIds.map(r => r.recipe_id)
      } else {
        return emptyResult
      }
    }
  }

  // Build query with count
  let query = supabase
    .from('recipes')
    .select('*, profiles:user_id(display_name)', { count: 'exact' })
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (categoryRecipeIds) {
    query = query.in('id', categoryRecipeIds)
  }

  const { data, error, count } = await query.range(from, to)

  if (error) {
    return emptyResult
  }

  const totalCount = count || 0
  const totalPages = Math.ceil(totalCount / RECIPES_PER_PAGE)

  return {
    recipes: (data || []) as RecipeWithAuthor[],
    totalCount,
    totalPages,
    currentPage
  }
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
  searchParams: Promise<{ category?: string; page?: string }>
}) {
  const params = await searchParams
  const categorySlug = params.category
  const page = Math.max(1, parseInt(params.page || '1') || 1)

  const [result, categories] = await Promise.all([
    getRecipes(categorySlug, page),
    getCategories()
  ])

  const { recipes, totalCount, totalPages, currentPage } = result

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
        <>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              useIconPlaceholder
            />
          ))}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          basePath="/recipes"
          preserveParams={categorySlug ? { category: categorySlug } : {}}
          itemName="receta"
        />
        </>
      )}
    </div>
  )
}
