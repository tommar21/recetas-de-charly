'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { INGREDIENT_UNITS } from '@/lib/constants'
import { RecipeForm } from '@/components/recipes/recipe-form'
import type { RecipeFormData } from '@/lib/schemas/recipe'

export default function EditRecipePage() {
  const router = useRouter()
  const params = useParams()
  const recipeId = params.id as string
  const supabase = createClient()

  const [initialLoading, setInitialLoading] = useState(true)
  const [initialData, setInitialData] = useState<RecipeFormData | null>(null)
  const [initialCategories, setInitialCategories] = useState<string[]>([])
  const [initialTags, setInitialTags] = useState<string[]>([])

  useEffect(() => {
    async function loadRecipeData() {
      if (!supabase || !recipeId) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Debes iniciar sesion para editar recetas')
        router.push('/login')
        return
      }

      // Load recipe with all related data
      const { data: recipe, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients(
            quantity,
            unit,
            order_index,
            ingredient:ingredients(name)
          ),
          instructions(
            content,
            step_number
          ),
          recipe_categories(
            category_id
          ),
          recipe_tags(
            tag_id
          )
        `)
        .eq('id', recipeId)
        .single()

      if (error || !recipe) {
        toast.error('No se encontro la receta')
        router.push('/my-recipes')
        return
      }

      // Check ownership
      if (recipe.user_id !== user.id) {
        toast.error('No tienes permiso para editar esta receta')
        router.push('/my-recipes')
        return
      }

      // Process ingredients
      const ingredients = (recipe.recipe_ingredients || [])
        .sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index)
        .map((ri: { quantity: number | null; unit: string | null; ingredient: { name: string } | null }) => {
          const isCustomUnit = ri.unit && !INGREDIENT_UNITS.find(u => u.value === ri.unit)
          return {
            name: ri.ingredient?.name || '',
            quantity: ri.quantity?.toString() || '',
            unit: isCustomUnit ? 'otro' : (ri.unit || ''),
            customUnit: isCustomUnit ? ri.unit : '',
          }
        })

      // Process instructions
      const instructions = (recipe.instructions || [])
        .sort((a: { step_number: number }, b: { step_number: number }) => a.step_number - b.step_number)
        .map((inst: { content: string }) => ({
          content: inst.content,
        }))

      // Set initial data
      setInitialData({
        title: recipe.title,
        description: recipe.description || '',
        imageUrl: recipe.image_url || '',
        prepTime: recipe.prep_time?.toString() || '',
        cookingTime: recipe.cooking_time?.toString() || '',
        servings: recipe.servings || 4,
        difficulty: recipe.difficulty as 'easy' | 'medium' | 'hard' | undefined,
        ingredients: ingredients.length > 0 ? ingredients : [{ name: '', quantity: '', unit: '', customUnit: '' }],
        instructions: instructions.length > 0 ? instructions : [{ content: '' }],
        categoryIds: [],
      })

      // Set categories
      const categoryIds = (recipe.recipe_categories || []).map((rc: { category_id: string }) => rc.category_id)
      setInitialCategories(categoryIds)

      // Set tags
      const tagIds = (recipe.recipe_tags || []).map((rt: { tag_id: string }) => rt.tag_id)
      setInitialTags(tagIds)

      setInitialLoading(false)
    }

    loadRecipeData()
  }, [supabase, recipeId, router])

  if (initialLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <Skeleton className="h-9 w-36" />
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
            <div className="grid grid-cols-4 gap-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!initialData) {
    return null
  }

  return (
    <RecipeForm
      mode="edit"
      recipeId={recipeId}
      initialData={initialData}
      initialCategories={initialCategories}
      initialTags={initialTags}
      backUrl="/my-recipes"
    />
  )
}
