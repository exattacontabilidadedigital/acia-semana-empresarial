import Link from 'next/link'
import Image from 'next/image'
import { Calendar, ArrowUpRight, ImageOff } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import NovaEdicaoModal from '@/components/admin/NovaEdicaoModal'
import Pagination from '@/components/ui/Pagination'
import { formatDateShort } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

const STATUS_PILL: Record<string, { bg: string; color: string; label: string }> = {
  published: { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a', label: 'PUBLICADA' },
  draft: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'RASCUNHO' },
  archived: { bg: '#fee2e2', color: '#991b1b', label: 'ARQUIVADA' },
}

export default async function AdminEdicoesPage({
  searchParams,
}: {
  searchParams: { error?: string; pagina?: string }
}) {
  const supabase = createServerSupabaseClient()
  const page = Math.max(1, Number(searchParams.pagina) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const { data: editions, count } = await supabase
    .from('editions')
    .select(
      'id, year, ordinal, title, description, status, cover_url, color, order_index, created_at',
      { count: 'exact' }
    )
    .order('order_index', { ascending: true })
    .order('year', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  // Conta fotos por edição
  const { data: photoCounts } = await supabase
    .from('gallery_photos')
    .select('edition_id')

  const photosByEdition: Record<number, number> = {}
  for (const p of photoCounts ?? []) {
    const eid = (p as any).edition_id as number | null
    if (eid != null) photosByEdition[eid] = (photosByEdition[eid] ?? 0) + 1
  }

  const totalEditions = count ?? 0
  const { count: publishedCount } = await supabase
    .from('editions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published')
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="page-enter">
      <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="eyebrow mb-4">
            <span className="dot" />
            CONTEÚDO · EDIÇÕES ANTERIORES
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
            Edições
          </h1>
          <p
            className="mt-3"
            style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
          >
            Histórico das semanas empresariais. Aparecem na timeline de{' '}
            <code>/edicoes</code> quando publicadas.
          </p>
        </div>
        <NovaEdicaoModal />
      </div>

      {searchParams.error && (
        <div
          className="mb-6 p-3 rounded-xl text-sm"
          style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#b91c1c',
          }}
        >
          {searchParams.error}
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <MiniStat label="TOTAL" value={totalEditions} accent="var(--azul)" />
        <MiniStat label="PUBLICADAS" value={publishedCount ?? 0} accent="var(--verde-600)" />
        <MiniStat
          label="RASCUNHOS / ARQUIVADAS"
          value={totalEditions - (publishedCount ?? 0)}
          accent="var(--ink-50)"
        />
      </div>

      <div
        className="rounded-[20px] bg-white p-7"
        style={{ border: '1px solid var(--line)' }}
      >
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="min-w-0">
            <div
              className="mono text-[10px] tracking-[0.14em]"
              style={{ color: 'var(--ink-50)' }}
            >
              {totalEditions} REGISTROS
            </div>
            <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
              Timeline
            </h2>
          </div>
        </div>

        {(!editions || editions.length === 0) && (
          <div
            className="text-center py-16 mono text-[11px] tracking-[0.14em]"
            style={{ color: 'var(--ink-50)' }}
          >
            NENHUMA EDIÇÃO CADASTRADA
          </div>
        )}

        {editions && editions.length > 0 && (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['Capa', 'Ano', 'Edição', 'Fotos', 'Status', ''].map((h) => (
                    <th
                      key={h}
                      className="mono text-[10px] tracking-[0.1em] py-3 px-2 font-medium uppercase"
                      style={{ color: 'var(--ink-50)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {editions.map((ed: any) => {
                  const status = STATUS_PILL[ed.status] ?? STATUS_PILL.draft
                  return (
                    <tr key={ed.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td className="py-4 px-2">
                        <div
                          className="rounded-lg overflow-hidden grid place-items-center"
                          style={{
                            width: 56,
                            height: 36,
                            background: ed.color || 'var(--azul-50)',
                            color: 'white',
                          }}
                        >
                          {ed.cover_url ? (
                            <Image
                              src={ed.cover_url}
                              alt={ed.title}
                              width={56}
                              height={36}
                              className="object-cover w-full h-full"
                              unoptimized
                            />
                          ) : (
                            <Calendar size={14} />
                          )}
                        </div>
                      </td>
                      <td
                        className="py-4 px-2 mono whitespace-nowrap"
                        style={{ color: 'var(--ink)' }}
                      >
                        {ed.year}
                      </td>
                      <td className="py-4 px-2">
                        <div
                          className="font-semibold truncate max-w-[280px]"
                          style={{ color: 'var(--ink)' }}
                          title={ed.title}
                        >
                          {ed.ordinal ? `${ed.ordinal} — ` : ''}
                          {ed.title}
                        </div>
                        {ed.description && (
                          <div
                            className="text-xs truncate max-w-[280px]"
                            style={{ color: 'var(--ink-50)' }}
                          >
                            {ed.description}
                          </div>
                        )}
                      </td>
                      <td
                        className="py-4 px-2 mono whitespace-nowrap"
                        style={{ color: 'var(--ink-70)' }}
                      >
                        <span className="inline-flex items-center gap-1">
                          {photosByEdition[ed.id] ? (
                            photosByEdition[ed.id]
                          ) : (
                            <ImageOff size={12} style={{ color: 'var(--ink-50)' }} />
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-2">
                        <span
                          className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap"
                          style={{ background: status.bg, color: status.color }}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <Link
                          href={`/admin/edicoes/${ed.id}`}
                          className="mono text-[11px] tracking-[0.1em] inline-flex items-center gap-1 hover:opacity-70 transition-opacity"
                          style={{ color: 'var(--azul)' }}
                        >
                          ABRIR <ArrowUpRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={count ?? 0}
          buildUrl={(p) => {
            const params = new URLSearchParams()
            if (p > 1) params.set('pagina', String(p))
            return params.toString() ? `?${params.toString()}` : '?'
          }}
        />
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: string
}) {
  return (
    <div
      className="rounded-2xl bg-white p-4"
      style={{ border: '1px solid var(--line)' }}
    >
      <div
        className="mono text-[10px] tracking-[0.14em]"
        style={{ color: 'var(--ink-50)' }}
      >
        {label}
      </div>
      <div
        className="display mt-1"
        style={{ fontSize: 28, color: accent, letterSpacing: '-0.02em' }}
      >
        {value}
      </div>
    </div>
  )
}
