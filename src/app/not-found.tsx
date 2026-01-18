import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChefHat, Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <div className="flex flex-col items-center text-center">
        <div className="p-4 rounded-full bg-muted mb-6">
          <ChefHat className="h-16 w-16 text-muted-foreground" />
        </div>

        <h1 className="text-4xl font-bold mb-2">404</h1>
        <h2 className="text-xl font-medium mb-4">Pagina no encontrada</h2>

        <p className="text-muted-foreground mb-8 max-w-md">
          Lo sentimos, la pagina que buscas no existe o fue movida.
          Quizas quieras explorar nuestras recetas o volver al inicio.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Volver al inicio
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/recipes">
              <Search className="mr-2 h-4 w-4" />
              Explorar recetas
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
