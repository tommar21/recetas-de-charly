import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, Tag } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { RecipeCard } from '@/components/recipes/recipe-card'
import { Badge } from '@/components/ui/badge'

const RECIPES_PER_PAGE = 12

interface SearchFilters {
  q?: string
  category?: string
  difficulty?: string
  time?: string
  tag?: string
  page?: number
}

// Recipe type for search results - using any for Supabase joined data
interface SearchRecipe {
  id: string
  title: string
  slug: string
  description: string | null
  image_url: string | null
  cooking_time: number | null
  prep_time: number | null
  servings: number | null
  difficulty: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recipe_tags?: any
}

interface SearchResult {
  recipes: SearchRecipe[]
  categories: Array<{ id: string; name: string; slug: string }>
  tags: Array<{ id: string; name: string; slug: string; color: string | null }>
  totalCount: number
  totalPages: number
  currentPage: number
  error: string | null
}

// Sanitize search query to prevent issues with special characters
function sanitizeSearchQuery(query: string | undefined): string | undefined {
  if (!query) return undefined

  // Limit length to prevent performance issues
  const trimmed = query.trim().slice(0, 100)

  // Escape special characters for ILIKE pattern
  // % and _ are wildcards in SQL ILIKE
  return trimmed
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/%/g, '\\%')   // Escape percent
    .replace(/_/g, '\\_')   // Escape underscore
}

async function searchRecipes(filters: SearchFilters): Promise<SearchResult> {
  const supabase = await createClient()
  const emptyResult: SearchResult = {
    recipes: [],
    categories: [],
    tags: [],
    totalCount: 0,
    totalPages: 0,
    currentPage: filters.page || 1,
    error: null
  }

  if (!supabase) return emptyResult

  try {
    // Fetch categories and tags for the filter dropdowns in parallel
    const [categoriesResult, tagsResult] = await Promise.all([
      supabase.from('categories').select('id, name, slug').order('name'),
      supabase.from('tags').select('id, name, slug, color').order('name')
    ])

    if (categoriesResult.error) throw categoriesResult.error
    if (tagsResult.error) throw tagsResult.error

    const categories = categoriesResult.data
    const tags = tagsResult.data

    // Calculate pagination
    const currentPage = Math.max(1, filters.page || 1)
    const from = (currentPage - 1) * RECIPES_PER_PAGE
    const to = from + RECIPES_PER_PAGE - 1

    // Get category recipe IDs if filtering by category
    let categoryRecipeIds: string[] | null = null
    if (filters.category && filters.category !== 'all') {
      const { data: categoryRecipes, error: categoryError } = await supabase
        .from('recipe_categories')
        .select('recipe_id, categories!inner(slug)')
        .eq('categories.slug', filters.category)

      if (categoryError) throw categoryError
      categoryRecipeIds = categoryRecipes?.map((cr) => cr.recipe_id) || []

      if (categoryRecipeIds.length === 0) {
        return { ...emptyResult, categories: categories || [], tags: tags || [] }
      }
    }

    // Get tag recipe IDs if filtering by tag
    let tagRecipeIds: string[] | null = null
    if (filters.tag && filters.tag !== 'all') {
      const { data: tagRecipes, error: tagError } = await supabase
        .from('recipe_tags')
        .select('recipe_id, tags!inner(slug)')
        .eq('tags.slug', filters.tag)

      if (tagError) throw tagError
      tagRecipeIds = tagRecipes?.map((tr) => tr.recipe_id) || []

      if (tagRecipeIds.length === 0) {
        return { ...emptyResult, categories: categories || [], tags: tags || [] }
      }
    }

    // Build the recipe query with count
    let query = supabase
      .from('recipes')
      .select('id, title, slug, description, image_url, cooking_time, prep_time, servings, difficulty, recipe_tags(tags(name, color))', { count: 'exact' })
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    // Apply text search with sanitized query
    const sanitizedQuery = sanitizeSearchQuery(filters.q)
    if (sanitizedQuery) {
      query = query.or(`title.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`)
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

    // Apply category filter
    if (categoryRecipeIds) {
      query = query.in('id', categoryRecipeIds)
    }

    // Apply tag filter
    if (tagRecipeIds) {
      // If both category and tag filters, get intersection
      if (categoryRecipeIds) {
        const intersection = categoryRecipeIds.filter(id => tagRecipeIds!.includes(id))
        if (intersection.length === 0) {
          return { ...emptyResult, categories: categories || [], tags: tags || [] }
        }
        query = query.in('id', intersection)
      } else {
        query = query.in('id', tagRecipeIds)
      }
    }

    const { data: recipes, error: recipesError, count } = await query.range(from, to)

    if (recipesError) throw recipesError

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / RECIPES_PER_PAGE)

    return {
      recipes: recipes || [],
      categories: categories || [],
      tags: tags || [],
      totalCount,
      totalPages,
      currentPage,
      error: null
    }
  } catch {
    return { ...emptyResult, error: 'Error al buscar recetas' }
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; difficulty?: string; time?: string; tag?: string; page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1') || 1)
  const { recipes, categories, tags, totalPages, currentPage, error } = await searchRecipes({
    ...params,
    page
  })

  // Helper to build pagination URLs
  const buildPageUrl = (pageNum: number) => {
    const urlParams = new URLSearchParams()
    if (params.q) urlParams.set('q', params.q)
    if (params.category) urlParams.set('category', params.category)
    if (params.difficulty) urlParams.set('difficulty', params.difficulty)
    if (params.time) urlParams.set('time', params.time)
    if (params.tag) urlParams.set('tag', params.tag)
    if (pageNum > 1) urlParams.set('page', pageNum.toString())
    const queryString = urlParams.toString()
    return `/search${queryString ? `?${queryString}` : ''}`
  }

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
            {params.tag && <input type="hidden" name="tag" value={params.tag} />}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="q"
                type="search"
                placeholder="Buscar por nombre, ingrediente..."
                className="pl-10"
                defaultValue={params.q || ''}
                maxLength={100}
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
          {tags.length > 0 && (
            <Select name="tag" defaultValue={params.tag || 'all'}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Etiqueta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.slug}>
                    <span className="flex items-center gap-2">
                      <Tag className="h-3 w-3" />
                      {tag.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button type="submit" variant="secondary">Aplicar</Button>
        </form>
      </div>

      {/* Active Tag Filter Badge */}
      {params.tag && params.tag !== 'all' && (
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-muted-foreground">Filtrando por etiqueta:</span>
          {(() => {
            const activeTag = tags.find(t => t.slug === params.tag)
            if (!activeTag) return null
            return (
              <Badge
                variant="outline"
                className="gap-1"
                style={activeTag.color ? { borderColor: activeTag.color, color: activeTag.color } : undefined}
              >
                <Tag className="h-3 w-3" />
                {activeTag.name}
              </Badge>
            )
          })()}
          <Link
            href={buildPageUrl(1).replace(/[?&]tag=[^&]+/, '').replace(/\?$/, '')}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Quitar filtro
          </Link>
        </div>
      )}

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
        <>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={currentPage <= 1}
            >
              <Link href={buildPageUrl(currentPage - 1)} aria-disabled={currentPage <= 1}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Link>
            </Button>

            <span className="text-sm text-muted-foreground px-4">
              Pagina {currentPage} de {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={currentPage >= totalPages}
            >
              <Link href={buildPageUrl(currentPage + 1)} aria-disabled={currentPage >= totalPages}>
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        )}
        </>
      ) : !error ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-4">🔍</p>
          <h3 className="text-xl font-semibold mb-2">No se encontraron recetas</h3>
          <p className="text-muted-foreground mb-6">
            {params.q
              ? `No hay recetas que coincidan con "${params.q}"`
              : 'Intenta con otros filtros o busca algo diferente'}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {(params.q || params.category || params.difficulty || params.time || params.tag) && (
              <Button variant="outline" asChild>
                <Link href="/search">Limpiar filtros</Link>
              </Button>
            )}
            <Button asChild>
              <Link href="/recipes">Ver todas las recetas</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
