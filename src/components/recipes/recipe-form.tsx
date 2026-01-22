'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { ChefHat, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { recipeSchema, generateSlug, type RecipeFormData } from '@/lib/schemas/recipe'
import { RecipeFormFields } from './recipe-form-fields'

interface RecipeFormProps {
  mode: 'create' | 'edit'
  recipeId?: string
  initialData?: RecipeFormData
  initialCategories?: string[]
  initialTags?: string[]
  backUrl?: string
}

const defaultFormValues: RecipeFormData = {
  title: '',
  description: '',
  imageUrl: '',
  prepTime: '',
  cookingTime: '',
  servings: 4,
  difficulty: undefined,
  ingredients: [{ name: '', quantity: '', unit: '', customUnit: '' }],
  instructions: [{ content: '' }],
  categoryIds: [],
}

export function RecipeForm({
  mode,
  recipeId,
  initialData,
  initialCategories = [],
  initialTags = [],
  backUrl = '/recipes',
}: RecipeFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories)
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags)

  const form = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema) as Resolver<RecipeFormData>,
    defaultValues: initialData || defaultFormValues,
  })

  // Update form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      form.reset(initialData)
    }
  }, [initialData, form])

  // Update categories when initialCategories changes
  useEffect(() => {
    setSelectedCategories(initialCategories)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialCategories)])

  // Update tags when initialTags changes
  useEffect(() => {
    setSelectedTags(initialTags)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialTags)])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (form.formState.isDirty || (mode === 'create' && selectedCategories.length > 0)) {
        e.preventDefault()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [form.formState.isDirty, selectedCategories, mode])

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const onSubmit = async (data: RecipeFormData) => {
    if (!supabase) {
      toast.error('Supabase no esta configurado')
      return
    }

    // Filter out empty ingredients and instructions
    const validIngredients = data.ingredients.filter(i => i.name.trim())
    const validInstructions = data.instructions.filter(i => i.content.trim())

    if (validIngredients.length === 0) {
      toast.error('Agrega al menos un ingrediente con nombre')
      return
    }

    if (validInstructions.length === 0) {
      toast.error('Agrega al menos un paso con contenido')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Debes iniciar sesion')
        router.push('/login')
        return
      }

      const slug = generateSlug(data.title)

      // Prepare ingredients for atomic function
      const ingredientsJson = validIngredients.map(ing => ({
        name: ing.name.trim().toLowerCase(),
        quantity: ing.quantity ? parseFloat(ing.quantity) : null,
        unit: ing.unit === 'otro' ? ing.customUnit?.trim() || null : ing.unit || null,
      }))

      // Prepare instructions for atomic function
      const instructionsJson = validInstructions.map(inst => ({
        content: inst.content.trim(),
      }))

      if (mode === 'create') {
        // Create recipe atomically
        const { data: newRecipeId, error: recipeError } = await supabase
          .rpc('create_recipe_atomic', {
            p_user_id: user.id,
            p_title: data.title.trim(),
            p_slug: slug,
            p_description: data.description?.trim() || null,
            p_image_url: data.imageUrl?.trim() || null,
            p_prep_time: data.prepTime ? parseInt(data.prepTime, 10) : null,
            p_cooking_time: data.cookingTime ? parseInt(data.cookingTime, 10) : null,
            p_servings: data.servings || 4,
            p_difficulty: data.difficulty || 'medium',
            p_is_public: true,
            p_ingredients: ingredientsJson,
            p_instructions: instructionsJson,
            p_category_ids: selectedCategories,
          })

        if (recipeError) {
          handleError(recipeError, 'crear')
          return
        }

        // Save tags separately (not in atomic function)
        if (selectedTags.length > 0) {
          await supabase
            .from('recipe_tags')
            .insert(selectedTags.map(tagId => ({
              recipe_id: newRecipeId,
              tag_id: tagId,
            })))
        }

        toast.success('Receta creada exitosamente!')
        router.push(`/recipes/${newRecipeId}`)
      } else {
        // Update recipe atomically
        const { error: recipeError } = await supabase
          .rpc('update_recipe_atomic', {
            p_recipe_id: recipeId,
            p_user_id: user.id,
            p_title: data.title.trim(),
            p_slug: slug,
            p_description: data.description?.trim() || null,
            p_image_url: data.imageUrl?.trim() || null,
            p_prep_time: data.prepTime ? parseInt(data.prepTime, 10) : null,
            p_cooking_time: data.cookingTime ? parseInt(data.cookingTime, 10) : null,
            p_servings: data.servings || 4,
            p_difficulty: data.difficulty || 'medium',
            p_is_public: true,
            p_ingredients: ingredientsJson,
            p_instructions: instructionsJson,
            p_category_ids: selectedCategories,
          })

        if (recipeError) {
          handleError(recipeError, 'actualizar')
          return
        }

        // Update tags: delete existing and insert new
        await supabase
          .from('recipe_tags')
          .delete()
          .eq('recipe_id', recipeId)

        if (selectedTags.length > 0) {
          await supabase
            .from('recipe_tags')
            .insert(selectedTags.map(tagId => ({
              recipe_id: recipeId,
              tag_id: tagId,
            })))
        }

        toast.success('Receta actualizada exitosamente!')
        router.push(`/recipes/${recipeId}`)
      }
    } catch {
      toast.error(`Error al ${mode === 'create' ? 'crear' : 'actualizar'} la receta`)
    } finally {
      setLoading(false)
    }
  }

  const handleError = (error: { code?: string; message?: string }, action: string) => {
    if (error.code === '23505' || error.message?.includes('duplicate')) {
      toast.error('Ya tienes una receta con ese nombre')
    } else if (error.message?.includes('not found') || error.message?.includes('not owned')) {
      toast.error('No tienes permiso para editar esta receta')
    } else {
      console.error(`Recipe ${action} error:`, error)
      toast.error(`Error al ${action} la receta`)
    }
  }

  const isCreate = mode === 'create'

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backUrl}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isCreate ? 'Volver a recetas' : 'Volver a mis recetas'}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <ChefHat className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>{isCreate ? 'Nueva Receta' : 'Editar Receta'}</CardTitle>
              <CardDescription>
                {isCreate
                  ? 'Comparte tu receta con la comunidad'
                  : 'Modifica los detalles de tu receta'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <RecipeFormFields
                form={form}
                selectedCategories={selectedCategories}
                onToggleCategory={toggleCategory}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
              />

              {/* Submit */}
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" asChild>
                  <Link href={backUrl}>Cancelar</Link>
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : isCreate ? (
                    'Publicar Receta'
                  ) : (
                    'Guardar Cambios'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
