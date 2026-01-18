'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalCount?: number
  basePath: string
  preserveParams?: Record<string, string>
  itemName?: string
}

export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  basePath,
  preserveParams = {},
  itemName = 'item',
}: PaginationProps) {
  const [jumpPage, setJumpPage] = useState('')
  const router = useRouter()

  const buildPageUrl = useMemo(() => {
    return (pageNum: number) => {
      const params = new URLSearchParams()
      Object.entries(preserveParams).forEach(([key, value]) => {
        if (value) params.set(key, value)
      })
      if (pageNum > 1) params.set('page', pageNum.toString())
      const queryString = params.toString()
      return `${basePath}${queryString ? `?${queryString}` : ''}`
    }
  }, [basePath, preserveParams])

  const handleJumpSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const page = parseInt(jumpPage, 10)
      if (page >= 1 && page <= totalPages && page !== currentPage) {
        router.push(buildPageUrl(page))
      }
      setJumpPage('')
    },
    [jumpPage, totalPages, currentPage, buildPageUrl, router]
  )

  if (totalPages <= 1) return null

  return (
    <div className="space-y-4 mt-8">
      {/* Pagination controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          asChild
          disabled={currentPage <= 1}
        >
          <Link
            href={buildPageUrl(currentPage - 1)}
            aria-disabled={currentPage <= 1}
            tabIndex={currentPage <= 1 ? -1 : 0}
            className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Link>
        </Button>

        {/* Page indicator with jump input */}
        <form onSubmit={handleJumpSubmit} className="flex items-center gap-2 px-2">
          <span className="text-sm text-muted-foreground">Pagina</span>
          <Input
            type="number"
            min={1}
            max={totalPages}
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value)}
            placeholder={currentPage.toString()}
            className="w-16 h-8 text-center text-sm"
            aria-label="Ir a pagina"
          />
          <span className="text-sm text-muted-foreground">de {totalPages}</span>
        </form>

        <Button
          variant="outline"
          size="sm"
          asChild
          disabled={currentPage >= totalPages}
        >
          <Link
            href={buildPageUrl(currentPage + 1)}
            aria-disabled={currentPage >= totalPages}
            tabIndex={currentPage >= totalPages ? -1 : 0}
            className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
          >
            Siguiente
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>

      {/* Total count */}
      {totalCount !== undefined && totalCount > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          {totalCount} {itemName}{totalCount !== 1 ? 's' : ''} en total
        </p>
      )}
    </div>
  )
}
