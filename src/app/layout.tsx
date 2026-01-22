import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { getUser } from "@/lib/auth/get-user"
import { AuthProvider } from "@/lib/auth/auth-context"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: {
    default: "Recetas de Charly",
    template: "%s | Recetas de Charly",
  },
  description: "Descubre, guarda y comparte las mejores recetas de cocina",
  keywords: ["recetas", "cocina", "comida", "gastronomia"],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getUser()

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <AuthProvider initialUser={user}>
            {/* Skip link for keyboard navigation */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none"
            >
              Saltar al contenido principal
            </a>
            <div className="relative flex min-h-screen flex-col">
              <Header initialUser={user} />
              <main id="main-content" className="flex-1">{children}</main>
              <Footer />
            </div>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  )
}
