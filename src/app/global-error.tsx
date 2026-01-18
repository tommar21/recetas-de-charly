'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-10 w-10 text-red-600" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Error Critico
              </h1>
              <p className="text-muted-foreground">
                La aplicacion encontro un error grave. Por favor recarga la pagina.
              </p>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <div className="rounded-md bg-gray-100 p-4 text-left">
                <p className="text-sm font-mono text-gray-700 break-all">
                  {error.message}
                </p>
              </div>
            )}
            <Button onClick={reset} size="lg">
              <RefreshCw className="mr-2 h-4 w-4" />
              Recargar pagina
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}
