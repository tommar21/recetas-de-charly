'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { ChefHat, Pencil, Bookmark, Heart, Calendar, Loader2, User, Lock, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { ImageUpload } from '@/components/ui/image-upload'

// Zod schema for profile validation
const profileSchema = z.object({
  display_name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .or(z.literal('')),
  avatar_url: z.union([z.string().url(), z.literal(''), z.null()]),
  bio: z
    .string()
    .max(300, 'La bio no puede exceder 300 caracteres')
    .or(z.literal('')),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface Profile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
}

interface Stats {
  recipes: number
  bookmarks: number
  likes: number
}

export default function ProfilePage() {
  const router = useRouter()
  // Singleton client - no memoization needed
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats>({ recipes: 0, bookmarks: 0, likes: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: '',
      avatar_url: '',
      bio: '',
    },
  })

  const { reset: formReset } = form

  useEffect(() => {
    async function loadProfile() {
      if (!supabase) {
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('Debes iniciar sesion para ver tu perfil')
        router.push('/login')
        return
      }

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        toast.error('Error al cargar el perfil')
        setLoading(false)
        return
      }

      const loadedProfile = {
        ...profileData,
        email: user.email || '',
      }
      setProfile(loadedProfile)

      formReset({
        display_name: profileData.display_name || '',
        avatar_url: profileData.avatar_url || '',
        bio: profileData.bio || '',
      })

      // Get stats in parallel
      const [recipeResult, bookmarkResult, likeResult] = await Promise.all([
        supabase
          .from('recipes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('bookmarks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('recipe_likes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ])

      setStats({
        recipes: recipeResult.count || 0,
        bookmarks: bookmarkResult.count || 0,
        likes: likeResult.count || 0,
      })

      setLoading(false)
    }

    loadProfile()
  }, [supabase, router, formReset])

  const onSubmit = useCallback(async (data: ProfileFormData) => {
    if (!supabase || !profile) return

    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: data.display_name?.trim() || null,
        avatar_url: data.avatar_url?.trim() || null,
        bio: data.bio?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    if (error) {
      toast.error('Error al guardar los cambios')
    } else {
      toast.success('Perfil actualizado')
      setProfile({
        ...profile,
        display_name: data.display_name?.trim() || null,
        avatar_url: data.avatar_url?.trim() || null,
        bio: data.bio?.trim() || null,
      })
      setSheetOpen(false)
      router.refresh()
    }

    setSaving(false)
  }, [supabase, profile, router])

  const handleChangePassword = useCallback(async () => {
    if (!supabase) return

    // Validate
    if (newPassword.length < 6) {
      toast.error('La contrasena debe tener al menos 6 caracteres')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Las contrasenas no coinciden')
      return
    }

    setChangingPassword(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      if (error.message.includes('same_password')) {
        toast.error('La nueva contrasena debe ser diferente a la actual')
      } else if (error.message.includes('weak_password')) {
        toast.error('La contrasena es demasiado debil')
      } else {
        toast.error('Error al cambiar la contrasena')
      }
    } else {
      toast.success('Contrasena actualizada correctamente')
      setNewPassword('')
      setConfirmPassword('')
    }

    setChangingPassword(false)
  }, [supabase, newPassword, confirmPassword])

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            {/* Header skeleton */}
            <div className="flex items-start gap-6 mb-8">
              <Skeleton className="h-24 w-24 sm:h-28 sm:w-28 rounded-full shrink-0" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            {/* Bio skeleton */}
            <Skeleton className="h-16 w-full mb-8" />
            {/* Stats skeleton */}
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="text-center py-12">
          <p className="text-4xl mb-4">👤</p>
          <h3 className="text-xl font-semibold mb-2">Perfil no encontrado</h3>
          <Button asChild>
            <Link href="/login">Iniciar Sesion</Link>
          </Button>
        </div>
      </div>
    )
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString('es', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Card className="overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          {/* Profile Header */}
          <div className="flex items-start gap-5 sm:gap-6 mb-6">
            {/* Avatar with ring */}
            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 ring-4 ring-background shadow-xl shrink-0">
              <AvatarImage
                src={profile.avatar_url || undefined}
                alt={profile.display_name || 'Usuario'}
              />
              <AvatarFallback className="text-3xl sm:text-4xl bg-primary/10 text-primary">
                {(profile.display_name || profile.email).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold truncate">
                  {profile.display_name || 'Usuario'}
                </h1>
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-full sm:max-w-lg overflow-y-auto shadow-2xl">
                    <SheetHeader className="text-left pb-2">
                      <SheetTitle className="text-xl flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Editar Perfil
                      </SheetTitle>
                      <SheetDescription>
                        Personaliza como te ven los demas
                      </SheetDescription>
                    </SheetHeader>

                    <Separator className="my-4" />

                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        {/* Avatar Upload - Centered */}
                        <FormField
                          control={form.control}
                          name="avatar_url"
                          render={({ field }) => (
                            <FormItem className="flex justify-center">
                              <FormControl>
                                <ImageUpload
                                  bucket="avatars"
                                  value={field.value}
                                  onChange={field.onChange}
                                  className="w-28 mx-auto"
                                  aspectRatio="square"
                                  rounded
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Separator />

                        {/* Form Fields */}
                        <div className="space-y-5 px-4">
                          {/* Display Name */}
                          <FormField
                            control={form.control}
                            name="display_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base">Nombre de Usuario</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Tu nombre"
                                    className="h-11"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Email (read-only) */}
                          <div className="space-y-2">
                            <FormLabel className="text-base">Email</FormLabel>
                            <Input
                              value={profile.email}
                              disabled
                              className="h-11 bg-muted/50 text-muted-foreground cursor-not-allowed"
                            />
                          </div>

                          {/* Bio */}
                          <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center justify-between">
                                  <FormLabel className="text-base">Bio</FormLabel>
                                  <span className="text-xs text-muted-foreground tabular-nums">
                                    {field.value?.length || 0}/300
                                  </span>
                                </div>
                                <FormControl>
                                  <Textarea
                                    placeholder="Cuentanos algo sobre ti y tu pasion por la cocina..."
                                    rows={4}
                                    className="resize-none"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Submit Button */}
                        <div className="px-4 pb-6">
                          <Button
                            type="submit"
                            className="w-full h-11 text-base font-medium"
                            disabled={saving}
                          >
                          {saving ? (
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
                  </SheetContent>
                </Sheet>
              </div>
              <p className="text-muted-foreground truncate mb-2">{profile.email}</p>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Miembro desde {memberSince}</span>
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mb-8 p-4 rounded-lg bg-muted/50 border">
              <p className="text-muted-foreground italic">&ldquo;{profile.bio}&rdquo;</p>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {/* Recipes */}
            <Link href="/my-recipes">
              <Card className="group cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ChefHat className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl sm:text-3xl font-bold tabular-nums">
                        {stats.recipes}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {stats.recipes === 1 ? 'Receta' : 'Recetas'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Likes */}
            <Card className="hover:shadow-md hover:border-primary/30 transition-all duration-200">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Heart className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold tabular-nums">
                      {stats.likes}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {stats.likes === 1 ? 'Like' : 'Likes'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bookmarks */}
            <Link href="/bookmarks">
              <Card className="group cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Bookmark className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl sm:text-3xl font-bold tabular-nums">
                        {stats.bookmarks}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {stats.bookmarks === 1 ? 'Guardada' : 'Guardadas'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Section */}
      <Card className="mt-6">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Cambiar Contrasena</h2>
          </div>

          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nueva contrasena</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimo 6 caracteres"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmar contrasena</label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contrasena"
              />
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !newPassword || !confirmPassword}
              className="mt-2"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cambiando...
                </>
              ) : (
                'Cambiar Contrasena'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
