import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Clock, Users, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS, type Difficulty } from '@/lib/constants'

interface SearchFilters {
  q?: string
  category?: string
  difficulty?: string
  time?: string
}

async function searchRecipes(filters: SearchFilters) {
  const supabase = await createClient()
  if (!supabase) return { recipes: [], categories: [], error: null }

  try {
    // Fetch categories for the filter dropdown
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name, slug')
      .order('name')

    if (categoriesError) throw categoriesError

    // Build the recipe query
    let query = supabase
      .from('recipes')
      .select('id, title, slug, description, image_url, cooking_time, prep_time, servings, difficulty')
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    // Apply text search
    if (filters.q) {
      query = query.or(`title.ilike.%${filters.q}%,description.ilike.%${filters.q}%`)
    }

    // Apply difficulty filter
    if (filters.difficulty && filters.difficulty !== 'all') {
      query = query.eq('difficulty', filters.difficulty)
    }

    // Apply time filter
    if (filters.time && filters.time !== 'all') {
      const maxTime = parseInt(filters.time)
      query = query.lte('cooking_time', maxTime)
    }

    const { data: recipes, error: recipesError } = await query.limit(20)

    if (recipesError) throw recipesError

    // If category filter is applied, filter by category
    let filteredRecipes = recipes || []
    if (filters.category && filters.category !== 'all') {
      const { data: categoryRecipes, error: categoryError } = await supabase
        .from('recipe_categories')
        .select('recipe_id, categories!inner(slug)')
        .eq('categories.slug', filters.category)

      if (categoryError) throw categoryError

      const categoryRecipeIds = new Set(categoryRecipes?.map((cr) => cr.recipe_id) || [])
      filteredRecipes = filteredRecipes.filter((r) => categoryRecipeIds.has(r.id))
    }

    return { recipes: filteredRecipes, categories: categories || [], error: null }
  } catch {
    return { recipes: [], categories: [], error: 'Error al buscar recetas' }
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; difficulty?: string; time?: string }>
}) {
  const params = await searchParams
  const { recipes, categories, error } = await searchRecipes(params)

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Buscar Recetas</h1>
        <div className="flex flex-col md:flex-row gap-4">
          <form className="flex-1 flex gap-2" action="/search" method="GET">
            {/* Preserve other filters */}
            {params.category && <input type="hidden" name="category" value={params.category} />}
            {params.difficulty && <input type="hidden" name="difficulty" value={params.difficulty} />}
            {params.time && <input type="hidden" name="time" value={params.time} />}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="q"
                type="search"
                placeholder="Buscar por nombre, ingrediente..."
                className="pl-10"
                defaultValue={params.q || ''}
              />
            </div>
            <Button type="submit">Buscar</Button>
          </form>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>
        <form className="flex flex-wrap gap-4" action="/search" method="GET">
          {/* Preserve search query */}
          {params.q && <input type="hidden" name="q" value={params.q} />}

          <Select name="difficulty" defaultValue={params.difficulty || 'all'}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Dificultad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="easy">Facil</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="hard">Dificil</SelectItem>
            </SelectContent>
          </Select>
          <Select name="time" defaultValue={params.time || 'all'}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tiempo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Cualquiera</SelectItem>
              <SelectItem value="15">Menos de 15 min</SelectItem>
              <SelectItem value="30">Menos de 30 min</SelectItem>
              <SelectItem value="60">Menos de 1 hora</SelectItem>
            </SelectContent>
          </Select>
          <Select name="category" defaultValue={params.category || 'all'}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.slug}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="secondary">Aplicar</Button>
        </form>
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-4xl mb-4">⚠️</p>
          <h3 className="text-xl font-semibold mb-2">Error al buscar</h3>
          <p className="text-muted-foreground">{error}</p>
        </div>
      )}

      {/* Results */}
      {!error && params.q && (
        <p className="text-muted-foreground mb-6">
          {recipes.length} resultado{recipes.length !== 1 ? 's' : ''} para &quot;{params.q}&quot;
        </p>
      )}

      {!error && recipes.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => {
            const difficulty = recipe.difficulty as Difficulty | null
            return (
              <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
                <Card className="group overflow-hidden hover:shadow-lg transition-shadow h-full">
                  <div className="relative aspect-[4/3] overflow-hidden">
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
                    {difficulty && (
                      <Badge
                        className={`absolute top-2 right-2 ${DIFFICULTY_COLORS[difficulty]}`}
                        variant="secondary"
                      >
                        {DIFFICULTY_LABELS[difficulty]}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                      {recipe.title}
                    </h3>
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
              </Link>
            )
          })}
        </div>
      ) : !error ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-4">🔍</p>
          <h3 className="text-xl font-semibold mb-2">No se encontraron recetas</h3>
          <p className="text-muted-foreground">
            {params.q
              ? `No hay recetas que coincidan con "${params.q}"`
              : 'Intenta con otros filtros o busca algo diferente'}
          </p>
        </div>
      ) : null}
    </div>
  )
}
