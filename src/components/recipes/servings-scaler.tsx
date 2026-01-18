'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Minus, Plus } from 'lucide-react'

interface Ingredient {
  quantity: number | null
  unit: string
  name: string
}

interface ServingsScalerProps {
  originalServings: number
  ingredients: Ingredient[]
}

export function ServingsScaler({ originalServings, ingredients }: ServingsScalerProps) {
  const [servings, setServings] = useState(originalServings)
  const ratio = servings / originalServings

  const decrease = () => setServings(s => Math.max(1, s - 1))
  const increase = () => setServings(s => Math.min(100, s + 1))

  const formatQuantity = (quantity: number | null) => {
    if (quantity === null) return null
    const scaled = quantity * ratio
    // Show decimals only if needed
    if (scaled === Math.floor(scaled)) {
      return scaled.toString()
    }
    return scaled.toFixed(1).replace(/\.0$/, '')
  }

  return (
    <div className="bg-muted/50 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Ingredientes</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={decrease}
            disabled={servings <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-sm min-w-[80px] text-center">
            {servings} {servings === 1 ? 'porcion' : 'porciones'}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={increase}
            disabled={servings >= 100}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {ingredients.length > 0 ? (
        <ul className="space-y-3">
          {ingredients.map((ingredient, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
              <span>
                {ingredient.quantity !== null && (
                  <span className="font-medium">
                    {formatQuantity(ingredient.quantity)} {ingredient.unit}{' '}
                  </span>
                )}
                {ingredient.name}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">
          No hay ingredientes listados
        </p>
      )}
    </div>
  )
}
