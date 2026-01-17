'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  Plus,
  Bookmark,
  User,
  LogOut,
  Menu,
  ChefHat,
  BookOpen
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { AuthUser } from '@/lib/auth/get-user'
import { SearchForm } from './search-form'

interface HeaderProps {
  initialUser: AuthUser | null
}

export function Header({ initialUser }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(initialUser)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!supabase) return

    // Listen for auth changes (login/logout during session)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: { user: { id: string; email?: string } } | null) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
      } else if (event === 'SIGNED_IN' && session?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', session.user.id)
            .single()

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            display_name: profile?.display_name || undefined,
            avatar_url: profile?.avatar_url || undefined,
          })
        } catch {
          // Profile fetch failed silently - user still authenticated
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleLogout = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error('Error al cerrar sesion')
    } else {
      toast.success('Sesion cerrada')
      router.push('/')
      router.refresh()
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <ChefHat className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline">Recetas de Charly</span>
        </Link>

        {/* Search Bar - Desktop */}
        <SearchForm className="hidden md:flex flex-1 max-w-md mx-4" />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/recipes/new">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Nueva Receta
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} alt={user.display_name || user.email} />
                      <AvatarFallback>
                        {(user.display_name || user.email).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      Mi Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/my-recipes">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Mis Recetas
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bookmarks">
                      <Bookmark className="mr-2 h-4 w-4" />
                      Mis Guardados
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Iniciar Sesion</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Registrarse</Link>
              </Button>
            </>
          )}
        </nav>

        {/* Mobile Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <div className="flex flex-col gap-4 mt-8">
              {/* Mobile Search */}
              <SearchForm onSubmit={() => setMobileMenuOpen(false)} />

              <div className="flex flex-col gap-2">
                <Link
                  href="/"
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-accent"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ChefHat className="h-5 w-5" />
                  Inicio
                </Link>
                <Link
                  href="/categories"
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-accent"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Categorias
                </Link>

                {user ? (
                  <>
                    <Link
                      href="/recipes/new"
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-accent"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Plus className="h-5 w-5" />
                      Nueva Receta
                    </Link>
                    <Link
                      href="/my-recipes"
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-accent"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <BookOpen className="h-5 w-5" />
                      Mis Recetas
                    </Link>
                    <Link
                      href="/bookmarks"
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-accent"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Bookmark className="h-5 w-5" />
                      Guardados
                    </Link>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-accent"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <User className="h-5 w-5" />
                      Mi Perfil
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left w-full"
                    >
                      <LogOut className="h-5 w-5" />
                      Cerrar Sesion
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-accent"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Iniciar Sesion
                    </Link>
                    <Link
                      href="/register"
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-accent"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Registrarse
                    </Link>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
