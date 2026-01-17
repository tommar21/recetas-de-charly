'use client'

import Link from 'next/link'
import { ChefHat } from 'lucide-react'
import type { AuthUser } from '@/lib/auth/get-user'

interface FooterProps {
  user: AuthUser | null
}

export function Footer({ user }: FooterProps) {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <ChefHat className="h-5 w-5 text-primary" />
              Recetas de Charly
            </Link>
            <p className="text-sm text-muted-foreground">
              Tu lugar para descubrir, guardar y compartir las mejores recetas.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold mb-4">Explorar</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/categories" className="text-muted-foreground hover:text-foreground">
                  Categorias
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-muted-foreground hover:text-foreground">
                  Buscar Recetas
                </Link>
              </li>
              <li>
                <Link href="/recipes" className="text-muted-foreground hover:text-foreground">
                  Todas las Recetas
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Cuenta</h3>
            <ul className="space-y-2 text-sm">
              {user ? (
                <>
                  <li>
                    <Link href="/profile" className="text-muted-foreground hover:text-foreground">
                      Mi Perfil
                    </Link>
                  </li>
                  <li>
                    <Link href="/my-recipes" className="text-muted-foreground hover:text-foreground">
                      Mis Recetas
                    </Link>
                  </li>
                  <li>
                    <Link href="/bookmarks" className="text-muted-foreground hover:text-foreground">
                      Mis Guardados
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link href="/login" className="text-muted-foreground hover:text-foreground">
                      Iniciar Sesion
                    </Link>
                  </li>
                  <li>
                    <Link href="/register" className="text-muted-foreground hover:text-foreground">
                      Registrarse
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Recetas de Charly. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
