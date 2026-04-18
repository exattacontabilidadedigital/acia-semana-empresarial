import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  /** Função que retorna a URL para a página N (para server components) */
  buildUrl?: (page: number) => string
  /** Callback ao mudar de página (para client components) */
  onPageChange?: (page: number) => void
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  buildUrl,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null

  // Gera range de páginas visíveis (max 5 ao redor da atual)
  const range: number[] = []
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, currentPage + 2)
  for (let i = start; i <= end; i++) range.push(i)

  const buttonBase =
    'inline-flex items-center justify-center rounded-lg border text-sm font-medium transition-colors min-w-[36px] h-9 px-2'
  const activeClass = 'bg-purple text-white border-purple'
  const inactiveClass = 'border-gray-300 text-gray-700 hover:bg-gray-50'
  const disabledClass = 'border-gray-200 text-gray-300 cursor-not-allowed'

  function renderButton(page: number, children: React.ReactNode, disabled?: boolean, isActive?: boolean) {
    const cls = `${buttonBase} ${disabled ? disabledClass : isActive ? activeClass : inactiveClass}`

    if (disabled) {
      return <span className={cls}>{children}</span>
    }

    if (buildUrl) {
      return (
        <Link href={buildUrl(page)} className={cls}>
          {children}
        </Link>
      )
    }

    return (
      <button onClick={() => onPageChange?.(page)} className={cls}>
        {children}
      </button>
    )
  }

  return (
    <div className="flex items-center justify-between border-t px-6 py-3">
      <span className="text-sm text-gray-500">
        Página {currentPage} de {totalPages} ({totalItems} registros)
      </span>
      <div className="flex items-center gap-1">
        {renderButton(currentPage - 1, <ChevronLeft size={16} />, currentPage <= 1)}

        {start > 1 && (
          <>
            {renderButton(1, '1')}
            {start > 2 && <span className="px-1 text-gray-400">...</span>}
          </>
        )}

        {range.map((p) => renderButton(p, String(p), false, p === currentPage))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-gray-400">...</span>}
            {renderButton(totalPages, String(totalPages))}
          </>
        )}

        {renderButton(currentPage + 1, <ChevronRight size={16} />, currentPage >= totalPages)}
      </div>
    </div>
  )
}
