'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

export default function NewRecipePage() {
  const router = useRouter()
  const supabase = createClient()

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
  } = useFieldArray({
    control: form.control,
    name: 'ingredients',
  })

  const {
    fields: instructionFields,
    append: appendInstruction,
    remove: removeInstruction,
  } = useFieldArray({
    control: form.control,
    name: 'instructions',
  })

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

  useEffect(() => {
    async function checkAuth() {
      if (!supabase) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Debes iniciar sesion para crear recetas')
        router.push('/login')
      }
    }
    checkAuth()
  }, [supabase, router])

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

      // Create recipe
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          title: data.title.trim(),
          slug,
          description: data.description?.trim() || null,
          image_url: data.imageUrl?.trim() || null,
          cooking_time: data.cookingTime ? parseInt(data.cookingTime, 10) : null,
          prep_time: data.prepTime ? parseInt(data.prepTime, 10) : null,
          servings: data.servings || 4,
          difficulty: data.difficulty || null,
          is_public: true,
        })
        .select()
        .single()

      if (recipeError) {
        if (recipeError.code === '23505') {
          toast.error('Ya tienes una receta con ese nombre')
        } else {
          toast.error('Error al crear la receta')
        }
        return
      }

      // Create ingredients
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
            recipe_id: recipe.id,
            ingredient_id: ingredientId,
            quantity: ing.quantity ? parseFloat(ing.quantity) : null,
            unit: finalUnit || null,
            order_index: i,
          })
      }

      // Create instructions
      for (let i = 0; i < validInstructions.length; i++) {
        await supabase
          .from('instructions')
          .insert({
            recipe_id: recipe.id,
            step_number: i + 1,
            content: validInstructions[i].content.trim(),
          })
      }

      // Link categories
      for (const categoryId of selectedCategories) {
        await supabase
          .from('recipe_categories')
          .insert({
            recipe_id: recipe.id,
            category_id: categoryId,
          })
      }

      toast.success('Receta creada exitosamente!')
      router.push(`/recipes/${recipe.id}`)
    } catch {
      toast.error('Error al crear la receta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/recipes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a recetas
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
              <CardTitle>Nueva Receta</CardTitle>
              <CardDescription>
                Comparte tu receta con la comunidad
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
                  <Link href="/recipes">Cancelar</Link>
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Publicar Receta'
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
