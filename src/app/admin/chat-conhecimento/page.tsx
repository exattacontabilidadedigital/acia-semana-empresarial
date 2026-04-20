import Link from 'next/link'
import { Bot, ArrowUpRight, Tag } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatDateShort } from '@/lib/utils'
import NovaFaqModal from '@/components/admin/NovaFaqModal'
import DeleteFaqButton from '@/components/admin/DeleteFaqButton'
import { toggleFaqAction } from './actions'

export const dynamic = 'force-dynamic'

const CATEGORY_LABELS: Record<string, string> = {
  faq: 'FAQ Geral',
  venue: 'Local / Venue',
  policy: 'Políticas',
  how_it_works: 'Como Funciona',
  other: 'Outros',
}

const CATEGORY_COLORS: Record<string, string> = {
  faq: 'var(--azul)',
  venue: 'var(--ciano)',
  policy: 'var(--laranja)',
  how_it_works: 'var(--verde)',
  other: 'var(--ink-50)',
}

export default async function AdminChatKnowledgePage({
  searchParams,
}: {
  searchParams: { saved?: string; deleted?: string; error?: string; cat?: string }
}) {
  const supabase = createServerSupabaseClient()

  let query = supabase
    .from('chat_knowledge')
    .select('id, category, question, answer, keywords, order_index, active, updated_at')
    .order('category', { ascending: true })
    .order('order_index', { ascending: true })

  if (searchParams.cat) {
    query = query.eq('category', searchParams.cat)
  }

  const { data: rows } = await query

  const total = rows?.length ?? 0
  const activeCount = (rows ?? []).filter((r: any) => r.active).length
  const inactiveCount = total - activeCount

  // Conta por categoria
  const allRowsForStats = await supabase
    .from('chat_knowledge')
    .select('category, active')
  const byCategory: Record<string, { total: number; active: number }> = {}
  for (const r of allRowsForStats.data ?? []) {
    const c = (r as any).category as string
    if (!byCategory[c]) byCategory[c] = { total: 0, active: 0 }
    byCategory[c].total++
    if ((r as any).active) byCategory[c].active++
  }

  return (
    <div className="page-enter">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-10">
        <div>
          <div className="eyebrow mb-4">
            <span className="dot" />
            CONHECIMENTO · ASSISTENTE ACI
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
            Conhecimento (Aci)
          </h1>
          <p
            className="mt-3"
            style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 620 }}
          >
            Base de FAQs e políticas que a IA do chat consulta. Edite aqui e a
            assistente passa a usar imediatamente — sem deploy.
          </p>
        </div>
        <NovaFaqModal />
      </div>

      {searchParams.saved && (
        <Banner color="success">FAQ salvo com sucesso.</Banner>
      )}
      {searchParams.deleted && (
        <Banner color="success">FAQ removido.</Banner>
      )}
      {searchParams.error && <Banner color="error">{searchParams.error}</Banner>}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="TOTAL" value={total} />
        <StatCard label="ATIVOS" value={activeCount} color="var(--verde-600)" />
        <StatCard label="INATIVOS" value={inactiveCount} color="var(--ink-50)" />
        <StatCard
          label="CATEGORIAS"
          value={Object.keys(byCategory).length}
          color="var(--azul)"
        />
      </div>

      {/* Filtro por categoria */}
      <div className="flex gap-2 flex-wrap mb-6">
        <CategoryPill
          href="/admin/chat-conhecimento"
          label={`Todos (${Object.values(byCategory).reduce((a, b) => a + b.total, 0)})`}
          active={!searchParams.cat}
        />
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
          const stats = byCategory[key]
          if (!stats) return null
          return (
            <CategoryPill
              key={key}
              href={`/admin/chat-conhecimento?cat=${key}`}
              label={`${label} (${stats.total})`}
              active={searchParams.cat === key}
              color={CATEGORY_COLORS[key]}
            />
          )
        })}
      </div>

      {/* Lista */}
      {!rows || rows.length === 0 ? (
        <div
          className="rounded-2xl bg-white text-center"
          style={{ padding: '64px 32px', border: '1px solid var(--line)' }}
        >
          <Bot size={42} className="mx-auto mb-3" style={{ color: 'var(--ink-50)', opacity: 0.4 }} />
          <div className="display mb-2" style={{ fontSize: 22 }}>
            Nenhum conhecimento cadastrado
          </div>
          <p className="text-sm" style={{ color: 'var(--ink-70)' }}>
            Comece adicionando uma FAQ no botão "+ Novo conhecimento" acima.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row: any) => {
            const color = CATEGORY_COLORS[row.category] ?? 'var(--ink-50)'
            const catLabel = CATEGORY_LABELS[row.category] ?? row.category
            return (
              <div
                key={row.id}
                className="rounded-xl bg-white p-5 transition-all hover:-translate-y-0.5"
                style={{
                  border: '1px solid var(--line)',
                  borderLeft: `3px solid ${color}`,
                  opacity: row.active ? 1 : 0.55,
                }}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className="mono uppercase tracking-[0.1em] text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${color}15`, color }}
                      >
                        {catLabel}
                      </span>
                      {!row.active && (
                        <span
                          className="mono uppercase tracking-[0.1em] text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: '#f1f1f1', color: 'var(--ink-50)' }}
                        >
                          Inativo
                        </span>
                      )}
                      {row.keywords && row.keywords.length > 0 && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px]"
                          style={{ color: 'var(--ink-50)' }}
                        >
                          <Tag size={10} />
                          {row.keywords.slice(0, 4).join(', ')}
                          {row.keywords.length > 4 ? '…' : ''}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/admin/chat-conhecimento/${row.id}`}
                      className="display block"
                      style={{ fontSize: 17, letterSpacing: '-0.01em', lineHeight: 1.3 }}
                    >
                      {row.question}
                    </Link>
                    <p
                      className="text-sm mt-2 line-clamp-2"
                      style={{ color: 'var(--ink-70)', maxWidth: 760 }}
                    >
                      {row.answer.length > 220 ? row.answer.slice(0, 220) + '…' : row.answer}
                    </p>
                    <div
                      className="mono text-[10px] tracking-[0.1em] mt-3"
                      style={{ color: 'var(--ink-50)' }}
                    >
                      ATUALIZADO {row.updated_at ? formatDateShort(row.updated_at) : '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <form action={toggleFaqAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="next" value={row.active ? 'false' : 'true'} />
                      <button
                        type="submit"
                        className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-paper-2"
                        style={{ color: 'var(--ink-70)', border: '1px solid var(--line)' }}
                        title={row.active ? 'Desativar' : 'Ativar'}
                      >
                        {row.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </form>
                    <Link
                      href={`/admin/chat-conhecimento/${row.id}`}
                      className="text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1 transition-colors"
                      style={{
                        color: 'var(--azul)',
                        background: 'var(--azul-50)',
                      }}
                    >
                      Editar <ArrowUpRight size={12} />
                    </Link>
                    <DeleteFaqButton id={row.id} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color?: string
}) {
  return (
    <div
      className="rounded-xl bg-white p-4"
      style={{ border: '1px solid var(--line)' }}
    >
      <div
        className="display"
        style={{ fontSize: 28, color: color ?? 'var(--ink)' }}
      >
        {value}
      </div>
      <div
        className="mono text-[10px] tracking-[0.14em] mt-1"
        style={{ color: 'var(--ink-50)' }}
      >
        {label}
      </div>
    </div>
  )
}

function CategoryPill({
  href,
  label,
  active,
  color,
}: {
  href: string
  label: string
  active: boolean
  color?: string
}) {
  return (
    <Link
      href={href}
      className="text-xs px-3 py-1.5 rounded-full transition-all"
      style={{
        background: active ? (color ?? 'var(--ink)') : 'white',
        color: active ? 'white' : 'var(--ink-70)',
        border: `1px solid ${active ? (color ?? 'var(--ink)') : 'var(--line)'}`,
      }}
    >
      {label}
    </Link>
  )
}

function Banner({
  color,
  children,
}: {
  color: 'success' | 'error'
  children: React.ReactNode
}) {
  const styles =
    color === 'success'
      ? { bg: 'rgba(166,206,58,0.10)', border: '1px solid rgba(166,206,58,0.4)', color: '#3d5a0a' }
      : { bg: '#fff1f2', border: '1px solid #fecdd3', color: '#b91c1c' }
  return (
    <div
      className="mb-6 p-3 rounded-xl text-sm"
      style={{ background: styles.bg, border: styles.border, color: styles.color }}
    >
      {children}
    </div>
  )
}
