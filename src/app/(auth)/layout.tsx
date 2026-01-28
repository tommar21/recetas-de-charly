export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center bg-muted/50 py-6 landscape:py-3 px-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
