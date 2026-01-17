'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ChefHat, Plus, Trash2, Loader2, ArrowLeft, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { ImageUpload } from '@/components/ui/image-upload'
import { INGREDIENT_UNITS } from '@/lib/constants'
import { recipeSchema, generateSlug, type RecipeFormData } from '@/lib/schemas/recipe'
import type { Category } from '@/lib/types'

export default function EditRecipePage() {
  const router = useRouter()
  const params = useParams()
  const recipeId = params.id as string
  const supabase = createClient()

  const [initialLoading, setInitialLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const form = useForm<RecipeFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(recipeSchema) as any,
    defaultValues: {
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
    },
  })

  const {
    fields: ingredientFields,
    append: appendIngredient,
    remove: removeIngredient,
    replace: replaceIngredients,
  } = useFieldArray({
    control: form.control,
    name: 'ingredients',
  })

  const {
    fields: instructionFields,
    append: appendInstruction,
    remove: removeInstruction,
    replace: replaceInstructions,
  } = useFieldArray({
    control: form.control,
    name: 'instructions',
  })

  // Load recipe data
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

      // Set form values
      form.reset({
        title: recipe.title,
        description: recipe.description || '',
        imageUrl: recipe.image_url || '',
        prepTime: recipe.prep_time || '',
        cookingTime: recipe.cooking_time || '',
        servings: recipe.servings || 4,
        difficulty: recipe.difficulty as 'easy' | 'medium' | 'hard' | undefined,
        ingredients: [{ name: '', quantity: '', unit: '', customUnit: '' }],
        instructions: [{ content: '' }],
      })

      // Set ingredients
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

      if (ingredients.length > 0) {
        replaceIngredients(ingredients)
      }

      // Set instructions
      const instructions = (recipe.instructions || [])
        .sort((a: { step_number: number }, b: { step_number: number }) => a.step_number - b.step_number)
        .map((inst: { content: string }) => ({
          content: inst.content,
        }))

      if (instructions.length > 0) {
        replaceInstructions(instructions)
      }

      // Set categories
      const categoryIds = (recipe.recipe_categories || []).map((rc: { category_id: string }) => rc.category_id)
      setSelectedCategories(categoryIds)

      setInitialLoading(false)
    }

    loadRecipeData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId])

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      if (!supabase) return
      const { data } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      setCategories(data || [])
    }
    loadCategories()
  }, [supabase])

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

      // Update recipe
      const { error: recipeError } = await supabase
        .from('recipes')
        .update({
          title: data.title.trim(),
          slug,
          description: data.description?.trim() || null,
          image_url: data.imageUrl?.trim() || null,
          cooking_time: data.cookingTime ? parseInt(data.cookingTime, 10) : null,
          prep_time: data.prepTime ? parseInt(data.prepTime, 10) : null,
          servings: data.servings || 4,
          difficulty: data.difficulty || null,
        })
        .eq('id', recipeId)

      if (recipeError) {
        if (recipeError.code === '23505') {
          toast.error('Ya tienes una receta con ese nombre')
        } else {
          toast.error('Error al actualizar la receta')
        }
        return
      }

      // Delete old ingredients
      await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', recipeId)

      // Create new ingredients
      for (let i = 0; i < validIngredients.length; i++) {
        const ing = validIngredients[i]
        let ingredientId: string

        const { data: existingIng } = await supabase
          .from('ingredients')
          .select('id')
          .eq('name', ing.name.trim().toLowerCase())
          .maybeSingle()

        if (existingIng) {
          ingredientId = existingIng.id
        } else {
          const { data: newIng, error: ingError } = await supabase
            .from('ingredients')
            .insert({ name: ing.name.trim().toLowerCase() })
            .select()
            .single()

          if (ingError) {
            continue
          }
          ingredientId = newIng.id
        }

        // Determine the unit (custom or selected)
        const finalUnit = ing.unit === 'otro' ? ing.customUnit?.trim() : ing.unit

        await supabase
          .from('recipe_ingredients')
          .insert({
            recipe_id: recipeId,
            ingredient_id: ingredientId,
            quantity: ing.quantity ? parseFloat(ing.quantity) : null,
            unit: finalUnit || null,
            order_index: i,
          })
      }

      // Delete old instructions
      await supabase
        .from('instructions')
        .delete()
        .eq('recipe_id', recipeId)

      // Create new instructions
      for (let i = 0; i < validInstructions.length; i++) {
        await supabase
          .from('instructions')
          .insert({
            recipe_id: recipeId,
            step_number: i + 1,
            content: validInstructions[i].content.trim(),
          })
      }

      // Delete old category links
      await supabase
        .from('recipe_categories')
        .delete()
        .eq('recipe_id', recipeId)

      // Link new categories
      for (const categoryId of selectedCategories) {
        await supabase
          .from('recipe_categories')
          .insert({
            recipe_id: recipeId,
            category_id: categoryId,
          })
      }

      toast.success('Receta actualizada exitosamente!')
      router.push(`/recipes/${recipeId}`)
    } catch {
      toast.error('Error al actualizar la receta')
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/my-recipes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a mis recetas
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
              <CardTitle>Editar Receta</CardTitle>
              <CardDescription>
                Modifica los detalles de tu receta
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-medium">Informacion basica</h3>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titulo *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Pasta Carbonara" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripcion</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Una breve descripcion de tu receta..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imagen</FormLabel>
                      <FormControl>
                        <ImageUpload
                          bucket="recipe-images"
                          value={field.value || null}
                          onChange={(url) => field.onChange(url || '')}
                          aspectRatio="video"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="prepTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prep (min)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="15"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cookingTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Coccion (min)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="30"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="servings"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Porciones</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="4"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dificultad</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="easy">Facil</SelectItem>
                            <SelectItem value="medium">Media</SelectItem>
                            <SelectItem value="hard">Dificil</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Categories */}
              <div className="space-y-4">
                <h3 className="font-medium">Categorias</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Badge
                      key={category.id}
                      variant={selectedCategories.includes(category.id) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleCategory(category.id)}
                    >
                      {category.icon} {category.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Ingredients */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Ingredientes *</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendIngredient({ name: '', quantity: '', unit: '', customUnit: '' })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar
                  </Button>
                </div>

                <div className="space-y-3">
                  {ingredientFields.map((field, index) => {
                    const unitValue = form.watch(`ingredients.${index}.unit`)
                    return (
                      <div key={field.id} className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground mt-3" />

                        <FormField
                          control={form.control}
                          name={`ingredients.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem className="w-20">
                              <FormControl>
                                <Input placeholder="Cant." {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`ingredients.${index}.unit`}
                          render={({ field }) => (
                            <FormItem className="w-36">
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Unidad" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {INGREDIENT_UNITS.map((unit) => (
                                    <SelectItem key={unit.value} value={unit.value}>
                                      {unit.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        {unitValue === 'otro' && (
                          <FormField
                            control={form.control}
                            name={`ingredients.${index}.customUnit`}
                            render={({ field }) => (
                              <FormItem className="w-24">
                                <FormControl>
                                  <Input placeholder="Unidad" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={form.control}
                          name={`ingredients.${index}.name`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input placeholder={`Ingrediente ${index + 1}`} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeIngredient(index)}
                          disabled={ingredientFields.length === 1}
                          className="mt-0.5"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
                {form.formState.errors.ingredients?.message && (
                  <p className="text-sm text-destructive">{form.formState.errors.ingredients.message}</p>
                )}
              </div>

              <Separator />

              {/* Instructions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Instrucciones *</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendInstruction({ content: '' })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar paso
                  </Button>
                </div>

                <div className="space-y-3">
                  {instructionFields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0 mt-1">
                        {index + 1}
                      </div>

                      <FormField
                        control={form.control}
                        name={`instructions.${index}.content`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Textarea
                                placeholder={`Describe el paso ${index + 1}...`}
                                rows={2}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeInstruction(index)}
                        disabled={instructionFields.length === 1}
                        className="mt-1"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
                {form.formState.errors.instructions?.message && (
                  <p className="text-sm text-destructive">{form.formState.errors.instructions.message}</p>
                )}
              </div>

              <Separator />

              {/* Submit */}
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" asChild>
                  <Link href="/my-recipes">Cancelar</Link>
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
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
