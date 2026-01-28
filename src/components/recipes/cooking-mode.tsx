'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChefHat, Check, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CookingModeProps {
  instructions: string[]
}

export function CookingMode({ instructions }: CookingModeProps) {
  const [isActive, setIsActive] = useState(false)
  const [completed, setCompleted] = useState<Set<number>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to cooking mode when activated
  useEffect(() => {
    if (isActive && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [isActive])

  const toggleStep = (index: number) => {
    setCompleted(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const resetProgress = () => {
    setCompleted(new Set())
  }

  const progress = instructions.length > 0
    ? Math.round((completed.size / instructions.length) * 100)
    : 0

  if (!isActive) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsActive(true)}
        className="w-full"
      >
        <ChefHat className="h-4 w-4 mr-2" />
        Activar modo cocina
      </Button>
    )
  }

  return (
    <div
      ref={containerRef}
      className="border rounded-lg p-4 landscape:p-3 bg-background scroll-mt-20"
    >
      <div className="flex items-center justify-between mb-4 landscape:mb-2">
        <div className="flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Modo Cocina</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetProgress}
            disabled={completed.size === 0}
            title="Reiniciar progreso"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsActive(false)}
          >
            <X className="h-4 w-4 mr-1" />
            Cerrar
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4 landscape:mb-2">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-muted-foreground">Progreso</span>
          <span className="font-medium">{completed.size}/{instructions.length}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Instructions checklist */}
      <ol className="space-y-3 landscape:space-y-2">
        {instructions.map((step, index) => (
          <li
            key={index}
            onClick={() => toggleStep(index)}
            className={cn(
              'flex gap-3 p-3 landscape:p-2 rounded-lg cursor-pointer transition-all',
              completed.has(index)
                ? 'bg-green-50 dark:bg-green-950/20'
                : 'bg-muted/50 hover:bg-muted'
            )}
          >
            <div
              className={cn(
                'shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                completed.has(index)
                  ? 'bg-green-500 text-white'
                  : 'bg-primary text-primary-foreground'
              )}
            >
              {completed.has(index) ? (
                <Check className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            <p
              className={cn(
                'pt-0.5 transition-all',
                completed.has(index) && 'line-through text-muted-foreground'
              )}
            >
              {step}
            </p>
          </li>
        ))}
      </ol>

      {/* Completion message */}
      {completed.size === instructions.length && instructions.length > 0 && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg text-center">
          <p className="text-green-700 dark:text-green-300 font-medium">
            Receta completada!
          </p>
        </div>
      )}
    </div>
  )
}
