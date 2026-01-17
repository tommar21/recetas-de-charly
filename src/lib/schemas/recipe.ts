import { z } from 'zod'

// Zod schema for recipe form validation
export const ingredientSchema = z.object({
  name: z.string().min(2, 'Minimo 2 caracteres').max(100, 'Maximo 100 caracteres'),
  quantity: z.string().optional(),
  unit: z.string().optional(),
  customUnit: z.string().optional(),
})

export const instructionSchema = z.object({
  content: z.string().min(10, 'Minimo 10 caracteres').max(1000, 'Maximo 1000 caracteres'),
})

export const recipeSchema = z.object({
  title: z.string().min(3, 'Minimo 3 caracteres').max(100, 'Maximo 100 caracteres'),
  description: z.string().max(500, 'Maximo 500 caracteres').optional().or(z.literal('')),
  imageUrl: z.string().url('URL no valida').optional().or(z.literal('')),
  prepTime: z.string().optional(),
  cookingTime: z.string().optional(),
  servings: z.coerce.number().min(1, 'Minimo 1 porcion').max(50, 'Maximo 50 porciones'),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  ingredients: z.array(ingredientSchema).min(1, 'Agrega al menos un ingrediente'),
  instructions: z.array(instructionSchema).min(1, 'Agrega al menos un paso'),
  categoryIds: z.array(z.string()).optional(),
})

export type RecipeFormData = z.infer<typeof recipeSchema>

// Helper to generate slug from title
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}
