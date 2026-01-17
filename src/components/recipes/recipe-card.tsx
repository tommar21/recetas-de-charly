import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Users, Heart } from 'lucide-react'
import type { Recipe } from '@/lib/types'
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS, type Difficulty } from '@/lib/constants'

interface RecipeCardProps {
  recipe: Recipe & {
    profile?: { display_name: string | null }
    likes_count?: number
  }
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const difficulty = recipe.difficulty as Difficulty | null

  return (
    <Link href={`/recipes/${recipe.id}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden">
          {recipe.image_url ? (
            <Image
              src={recipe.image_url}
              alt={recipe.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
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
            {recipe.likes_count !== undefined && recipe.likes_count > 0 && (
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                <span>{recipe.likes_count}</span>
              </div>
            )}
          </div>
          {recipe.profile?.display_name && (
            <p className="text-xs text-muted-foreground mt-2">
              por {recipe.profile.display_name}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
