'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Plus, Tag, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface TagData {
  id: string
  name: string
  slug: string
}

interface TagSelectorProps {
  selectedTags: string[]
  onTagsChange: (tagIds: string[]) => void
  allowCreate?: boolean
  className?: string
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function TagSelector({
  selectedTags,
  onTagsChange,
  allowCreate = true,
  className,
}: TagSelectorProps) {
  const [tags, setTags] = useState<TagData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newTagName, setNewTagName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [showInput, setShowInput] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function loadTags() {
      if (!supabase) {
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('tags')
        .select('id, name, slug')
        .order('name')

      if (!error && data) {
        setTags(data)
      }

      setIsLoading(false)
    }

    loadTags()
  }, [supabase])

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter(id => id !== tagId))
    } else {
      onTagsChange([...selectedTags, tagId])
    }
  }

  const handleCreateTag = async () => {
    if (!supabase || !newTagName.trim()) return

    const trimmedName = newTagName.trim()
    const slug = generateSlug(trimmedName)

    // Check if tag already exists
    const existingTag = tags.find(
      t => t.name.toLowerCase() === trimmedName.toLowerCase() || t.slug === slug
    )

    if (existingTag) {
      // Just select it if it exists
      if (!selectedTags.includes(existingTag.id)) {
        onTagsChange([...selectedTags, existingTag.id])
      }
      setNewTagName('')
      setShowInput(false)
      return
    }

    setIsCreating(true)

    const { data, error } = await supabase
      .from('tags')
      .insert({ name: trimmedName, slug })
      .select('id, name, slug')
      .single()

    if (error) {
      if (error.code === '23505') {
        toast.error('Este tag ya existe')
      } else {
        toast.error('Error al crear el tag')
      }
    } else if (data) {
      setTags(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      onTagsChange([...selectedTags, data.id])
      setNewTagName('')
      setShowInput(false)
      toast.success('Tag creado')
    }

    setIsCreating(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCreateTag()
    } else if (e.key === 'Escape') {
      setShowInput(false)
      setNewTagName('')
    }
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Cargando tags...</span>
      </div>
    )
  }

  const selectedTagObjects = tags.filter(t => selectedTags.includes(t.id))
  const availableTags = tags.filter(t => !selectedTags.includes(t.id))

  return (
    <div className={cn('space-y-3', className)}>
      {/* Selected Tags */}
      {selectedTagObjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTagObjects.map(tag => (
            <Badge
              key={tag.id}
              variant="default"
              className="gap-1 pr-1"
            >
              {tag.name}
              <button
                type="button"
                onClick={() => toggleTag(tag.id)}
                className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Available Tags */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTags.map(tag => (
            <Badge
              key={tag.id}
              variant="outline"
              className="cursor-pointer hover:bg-muted transition-colors"
              onClick={() => toggleTag(tag.id)}
            >
              <Plus className="h-3 w-3 mr-1" />
              {tag.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Create New Tag */}
      {allowCreate && (
        <div>
          {showInput ? (
            <div className="flex gap-2">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nombre del tag..."
                className="h-8 text-sm"
                autoFocus
              />
              <Button
                type="button"
                size="sm"
                onClick={handleCreateTag}
                disabled={isCreating || !newTagName.trim()}
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Crear'
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowInput(false)
                  setNewTagName('')
                }}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowInput(true)}
              className="text-muted-foreground"
            >
              <Tag className="h-4 w-4 mr-1" />
              Crear nuevo tag
            </Button>
          )}
        </div>
      )}

      {tags.length === 0 && !showInput && (
        <p className="text-sm text-muted-foreground">
          No hay tags disponibles. {allowCreate && 'Crea el primero!'}
        </p>
      )}
    </div>
  )
}
