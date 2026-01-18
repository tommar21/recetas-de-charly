/**
 * Recipe difficulty levels and their display properties
 */

export type Difficulty = 'easy' | 'medium' | 'hard'

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-amber-100 text-amber-900',
  hard: 'bg-red-100 text-red-800',
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Facil',
  medium: 'Media',
  hard: 'Dificil',
}

/**
 * Helper to get difficulty display info
 */
export function getDifficultyInfo(difficulty: string | null) {
  const key = difficulty as Difficulty
  if (!key || !DIFFICULTY_COLORS[key]) return null

  return {
    color: DIFFICULTY_COLORS[key],
    label: DIFFICULTY_LABELS[key],
  }
}

/**
 * Common cooking units
 */
export const INGREDIENT_UNITS = [
  { value: 'g', label: 'g (gramos)' },
  { value: 'kg', label: 'kg (kilogramos)' },
  { value: 'ml', label: 'ml (mililitros)' },
  { value: 'l', label: 'l (litros)' },
  { value: 'taza', label: 'taza(s)' },
  { value: 'cucharada', label: 'cucharada(s)' },
  { value: 'cucharadita', label: 'cucharadita(s)' },
  { value: 'unidad', label: 'unidad(es)' },
  { value: 'pizca', label: 'pizca' },
  { value: 'al gusto', label: 'al gusto' },
  { value: 'rebanada', label: 'rebanada(s)' },
  { value: 'diente', label: 'diente(s)' },
  { value: 'otro', label: 'Otro...' },
] as const

export type IngredientUnit = typeof INGREDIENT_UNITS[number]['value']
