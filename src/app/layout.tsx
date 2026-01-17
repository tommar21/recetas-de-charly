import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { getUser } from "@/lib/auth/get-user"

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
          <div className="relative flex min-h-screen flex-col">
            <Header initialUser={user} />
            <main className="flex-1">{children}</main>
            <Footer user={user} />
          </div>
        </Providers>
      </body>
    </html>
  )
}
