import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Users, Heart, ChefHat, Tag } from 'lucide-react'
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS, type Difficulty } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

// Tag type from join
interface TagData {
  name: string
  color?: string | null
}

// Flexible recipe type that accepts different data shapes
interface RecipeData {
  id: string
  title: string
  slug?: string
  description?: string | null
  image_url?: string | null
  cooking_time?: number | null
  prep_time?: number | null
  servings?: number | null
  difficulty?: string | null
  profiles?: { display_name: string | null } | null // From join
  profile?: { display_name: string | null } // Alternative key
  likes_count?: number
  recipe_tags?: { tags: TagData | null }[] | null // Tags from join
}

interface RecipeCardProps {
  recipe: RecipeData
  /** Optional action buttons to render in top-right corner */
  actions?: ReactNode
  /** Use ChefHat icon instead of emoji for placeholder */
  useIconPlaceholder?: boolean
  /** Additional class for the card */
  className?: string
  /** Show tags section (default: false) */
  showTags?: boolean
  /** Show author name (default: false) */
  showAuthor?: boolean
}

export function RecipeCard({
  recipe,
  actions,
  useIconPlaceholder = false,
  className,
  showTags = false,
  showAuthor = false
}: RecipeCardProps) {
  const difficulty = recipe.difficulty as Difficulty | null

  // Get author name from either profiles (join) or profile key
  const authorName = recipe.profiles?.display_name || recipe.profile?.display_name

  // Extract tags from join
  const tags = (recipe.recipe_tags || [])
    .map(rt => rt.tags)
    .filter((tag): tag is TagData => tag !== null)
    .slice(0, 3) // Max 3 tags to avoid overflow

  return (
    <Card className={cn("group overflow-hidden transition-all hover:shadow-lg h-full", className)}>
      <div className="relative">
        <Link href={`/recipes/${recipe.id}`}>
          <div className="relative aspect-4/3 overflow-hidden bg-muted">
            {recipe.image_url ? (
              <Image
                src={recipe.image_url}
                alt={recipe.title}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                {useIconPlaceholder ? (
                  <ChefHat className="h-12 w-12 text-muted-foreground" />
                ) : (
                  <span className="text-4xl">🍽️</span>
                )}
              </div>
            )}
          </div>
        </Link>
        {difficulty && (
          <Badge
            className={`absolute top-2 left-2 ${DIFFICULTY_COLORS[difficulty]}`}
            variant="secondary"
          >
            {DIFFICULTY_LABELS[difficulty]}
          </Badge>
        )}
        {/* Action buttons area - stops propagation to prevent navigation */}
        {actions && (
          <div
            className="absolute top-2 right-2 flex gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <Link href={`/recipes/${recipe.id}`}>
          <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
            {recipe.title}
          </h3>
        </Link>
        {recipe.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {recipe.description}
          </p>
        )}
        {showTags && tags.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
            {tags.map((tag) => (
              <Badge
                key={tag.name}
                variant="outline"
                className="text-xs px-1.5 py-0 h-5"
                style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          {recipe.cooking_time && (
            <div className="flex items-center gap-1" title="Tiempo de coccion">
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span>{recipe.cooking_time} min</span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-1" title="Porciones">
              <Users className="h-4 w-4" aria-hidden="true" />
              <span>{recipe.servings}</span>
            </div>
          )}
          <div className="flex items-center gap-1" title="Me gusta">
            <Heart className="h-4 w-4" aria-hidden="true" />
            <span>{recipe.likes_count ?? 0}</span>
          </div>
        </div>
        {showAuthor && authorName && (
          <p className="text-xs text-muted-foreground mt-2">
            por {authorName}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
