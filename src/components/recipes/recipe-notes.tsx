'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { StickyNote, Plus, Pencil, Trash2, Loader2, Lock, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface RecipeNote {
  id: string
  content: string
  is_private: boolean
  created_at: string
  updated_at: string
}

interface RecipeNotesProps {
  recipeId: string
}

export function RecipeNotes({ recipeId }: RecipeNotesProps) {
  const [notes, setNotes] = useState<RecipeNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isPrivate, setIsPrivate] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const supabase = createClient()

  useEffect(() => {
    let isMounted = true

    async function loadNotes() {
      if (!supabase) {
        if (isMounted) setIsLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()

      if (!isMounted) return

      if (!user) {
        setIsLoading(false)
        return
      }

      setUserId(user.id)

      const { data, error } = await supabase
        .from('recipe_notes')
        .select('*')
        .eq('recipe_id', recipeId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!isMounted) return

      if (!error && data) {
        setNotes(data)
      }

      setIsLoading(false)
    }

    loadNotes()

    return () => {
      isMounted = false
    }
  }, [supabase, recipeId])

  const handleAddNote = async () => {
    if (!supabase || !userId || !newNote.trim()) return

    setSaving(true)

    const { data, error } = await supabase
      .from('recipe_notes')
      .insert({
        user_id: userId,
        recipe_id: recipeId,
        content: newNote.trim(),
        is_private: isPrivate,
      })
      .select()
      .single()

    if (error) {
      toast.error('Error al guardar la nota')
    } else if (data) {
      setNotes(prev => [data, ...prev])
      setNewNote('')
      setIsAdding(false)
      toast.success('Nota guardada')
    }

    setSaving(false)
  }

  const handleUpdateNote = async (noteId: string) => {
    if (!supabase || !editContent.trim()) return

    setSaving(true)

    const { error } = await supabase
      .from('recipe_notes')
      .update({
        content: editContent.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', noteId)
      .eq('user_id', userId)

    if (error) {
      toast.error('Error al actualizar la nota')
    } else {
      setNotes(prev =>
        prev.map(n =>
          n.id === noteId ? { ...n, content: editContent.trim() } : n
        )
      )
      setEditingId(null)
      toast.success('Nota actualizada')
    }

    setSaving(false)
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!supabase) return

    const { error } = await supabase
      .from('recipe_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId)

    if (error) {
      toast.error('Error al eliminar la nota')
    } else {
      setNotes(prev => prev.filter(n => n.id !== noteId))
      toast.success('Nota eliminada')
    }
  }

  // Not logged in
  if (!userId && !isLoading) {
    return null
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Mis Notas</h3>
        </div>
        {!isAdding && userId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Add new note form */}
          {isAdding && (
            <div className="space-y-3 mb-4 p-3 bg-muted/50 rounded-lg">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Escribe una nota personal sobre esta receta..."
                rows={3}
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={cn(
                    'flex items-center gap-1 text-xs',
                    isPrivate ? 'text-muted-foreground' : 'text-primary'
                  )}
                >
                  {isPrivate ? (
                    <>
                      <Lock className="h-3 w-3" />
                      Privada
                    </>
                  ) : (
                    <>
                      <Globe className="h-3 w-3" />
                      Publica
                    </>
                  )}
                </button>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAdding(false)
                      setNewNote('')
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={saving || !newNote.trim()}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Guardar'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Notes list */}
          {notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 bg-muted/30 rounded-lg"
                >
                  {editingId === note.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingId(null)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateNote(note.id)}
                          disabled={saving}
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Guardar'
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-muted">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {note.is_private ? (
                            <Lock className="h-3 w-3" />
                          ) : (
                            <Globe className="h-3 w-3" />
                          )}
                          <span>
                            {new Date(note.created_at).toLocaleDateString('es')}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingId(note.id)
                              setEditContent(note.content)
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : !isAdding ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No tienes notas para esta receta
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
