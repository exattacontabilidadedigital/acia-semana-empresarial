import Link from 'next/link'
import { Inbox, Filter } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import LeadCard from '@/components/admin/LeadCard'
import Pagination from '@/components/ui/Pagination'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

const STATUS_LABEL: Record<string, string> = {
  new: 'Novos',
  contacted: 'Contatados',
  qualified: 'Qualificados',
  closed: 'Fechados',
  discarded: 'Descartados',
}

export default async function AdminLeadsPatrocinioPage({
  searchParams,
}: {
  searchParams: { status?: string; pagina?: string }
}) {
  const supabase = createServerSupabaseClient()
  const filter = searchParams.status ?? null
  const page = Math.max(1, Number(searchParams.pagina) || 1)
  const offset = (page - 1) * PAGE_SIZE

  let q = supabase
    .from('sponsorship_leads')
    .select(
      'id, name, company, email, phone, tier, message, status, notes, created_at, contacted_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)
  if (filter && Object.keys(STATUS_LABEL).includes(filter)) {
    q = q.eq('status', filter)
  }

  const { data: leads, count } = await q
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  // Conta por status pra montar os pills
  const { data: countsRaw } = await supabase
    .from('sponsorship_leads')
    .select('status')

  const counts: Record<string, number> = {
    new: 0,
    contacted: 0,
    qualified: 0,
    closed: 0,
    discarded: 0,
  }
  for (const r of countsRaw ?? []) {
    const s = (r as any).status as string
    if (s in counts) counts[s]++
  }
  const total = (countsRaw ?? []).length

  return (
    <div className="page-enter">
      <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="eyebrow mb-4">
            <span className="dot" />
            COMERCIAL · LEADS DE PATROCÍNIO
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
            Leads de patrocínio
          </h1>
          <p
            className="mt-3"
            style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
          >
            Empresas que enviaram interesse pelo formulário de{' '}
            <code>/parceiros</code>. Marque o status conforme o time comercial
            avança no contato.
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MiniStat label="TOTAL" value={total} accent="var(--ink)" />
        <MiniStat label="NOVOS" value={counts.new} accent="var(--laranja)" />
        <MiniStat label="CONTATADOS" value={counts.contacted} accent="var(--azul)" />
        <MiniStat label="QUALIFICADOS" value={counts.qualified} accent="var(--ciano)" />
        <MiniStat label="FECHADOS" value={counts.closed} accent="var(--verde-600)" />
        <MiniStat label="DESCARTADOS" value={counts.discarded} accent="var(--ink-50)" />
      </div>

      <div
        className="rounded-2xl bg-white p-4 mb-5 flex items-center gap-3 flex-wrap"
        style={{ border: '1px solid var(--line)' }}
      >
        <Filter size={14} style={{ color: 'var(--ink-50)' }} />
        <span
          className="mono text-[10px] tracking-[0.14em]"
          style={{ color: 'var(--ink-50)' }}
        >
          FILTRAR POR STATUS
        </span>
        <FilterPill
          label="Todos"
          href="/admin/leads-patrocinio"
          active={filter === null}
        />
        {Object.entries(STATUS_LABEL).map(([key, label]) => (
          <FilterPill
            key={key}
            label={label}
            href={`/admin/leads-patrocinio?status=${key}`}
            active={filter === key}
          />
        ))}
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
              {(leads ?? []).length} REGISTROS
            </div>
            <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
              {filter ? STATUS_LABEL[filter] : 'Todos os leads'}
            </h2>
          </div>
        </div>

        {(!leads || leads.length === 0) && (
          <div
            className="text-center py-16"
            style={{ color: 'var(--ink-50)' }}
          >
            <Inbox size={28} className="mx-auto mb-3" />
            <div className="mono text-[11px] tracking-[0.14em]">
              {filter ? 'NENHUM LEAD COM ESTE STATUS' : 'NENHUM LEAD AINDA'}
            </div>
          </div>
        )}

        {leads && leads.length > 0 && (
          <div className="space-y-3">
            {leads.map((lead: any) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={count ?? 0}
          buildUrl={(p) => {
            const params = new URLSearchParams()
            if (searchParams.status) params.set('status', searchParams.status)
            if (p > 1) params.set('pagina', String(p))
            return params.toString() ? `?${params.toString()}` : '?'
          }}
        />
      </div>
    </div>
  )
}

function FilterPill({
  label,
  href,
  active,
}: {
  label: string
  href: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className="mono text-[10px] tracking-[0.1em] px-3 py-1.5 rounded-full transition-colors"
      style={{
        background: active ? 'var(--azul)' : 'white',
        color: active ? 'white' : 'var(--ink-70)',
        border: '1px solid ' + (active ? 'var(--azul)' : 'var(--line)'),
      }}
    >
      {label}
    </Link>
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
        style={{ fontSize: 24, color: accent, letterSpacing: '-0.02em' }}
      >
        {value}
      </div>
    </div>
  )
}
