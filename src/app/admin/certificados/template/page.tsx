import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, Plus, FileText, Star } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function formatDateBr(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

export default async function TemplatesListPage() {
  const supabase = createServerSupabaseClient()

  const { data: templates } = await supabase
    .from('certificate_templates')
    .select(
      'id, name, event_id, duration_hours, logo_url, background_url, updated_at, events:event_id ( title, event_date )'
    )
    .order('event_id', { ascending: true, nullsFirst: true })
    .order('id', { ascending: true })

  // Conta assinaturas linkadas em cada template (1 query agregada)
  const { data: sigCounts } = await supabase
    .from('certificate_template_signatures')
    .select('template_id')
  const sigCountByTemplate: Record<number, number> = {}
  for (const r of sigCounts ?? []) {
    const id = (r as any).template_id as number
    sigCountByTemplate[id] = (sigCountByTemplate[id] ?? 0) + 1
  }

  const total = templates?.length ?? 0
  const eventCount = templates?.filter((t: any) => t.event_id !== null).length ?? 0

  return (
    <div className="page-enter">
      <Link
        href="/admin/certificados"
        className="mono text-[11px] tracking-[0.14em] inline-flex items-center gap-1 mb-6 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--ink-50)' }}
      >
        <ArrowLeft size={12} /> VOLTAR
      </Link>

      <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="eyebrow mb-4">
            <span className="dot" />
            CERTIFICADOS · TEMPLATES
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
            Templates
          </h1>
          <p
            className="mt-3"
            style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
          >
            Configure como o certificado fica visualmente. Você pode ter um
            template padrão (usado quando o evento não tem template específico)
            e templates dedicados pra cada evento.
          </p>
        </div>
        <Link href="/admin/certificados/template/new" className="btn btn-orange btn-lg">
          <Plus size={16} /> Novo template
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <MiniStat label="TOTAL" value={total} accent="var(--azul)" />
        <MiniStat
          label="POR EVENTO"
          value={eventCount}
          accent="var(--ciano-600)"
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
              {total} REGISTROS
            </div>
            <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
              Lista de templates
            </h2>
          </div>
        </div>

        {(!templates || templates.length === 0) && (
          <div
            className="text-center py-16"
            style={{ color: 'var(--ink-50)' }}
          >
            <FileText size={28} className="mx-auto mb-3" />
            <div className="mono text-[11px] tracking-[0.14em] mb-4">
              NENHUM TEMPLATE CADASTRADO
            </div>
            <Link
              href="/admin/certificados/template/new"
              className="btn btn-orange"
            >
              <Plus size={14} /> Criar primeiro template
            </Link>
          </div>
        )}

        {templates && templates.length > 0 && (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['Tipo', 'Nome', 'Evento', 'Carga horária', 'Assinaturas', ''].map((h) => (
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
                {templates.map((t: any) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td className="py-4 px-2">
                      {t.event_id === null ? (
                        <span
                          className="mono inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium"
                          style={{
                            background: 'rgba(248,130,30,0.18)',
                            color: '#b85d00',
                          }}
                        >
                          <Star size={10} fill="currentColor" /> PADRÃO
                        </span>
                      ) : (
                        <span
                          className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium"
                          style={{
                            background: 'var(--paper-2)',
                            color: 'var(--ink-70)',
                          }}
                        >
                          POR EVENTO
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-2">
                      <div
                        className="font-semibold"
                        style={{ color: 'var(--ink)' }}
                      >
                        {t.name}
                      </div>
                      {t.background_url && (
                        <div
                          className="mono text-[9px] mt-0.5"
                          style={{ color: 'var(--verde-600)' }}
                        >
                          COM IMAGEM DE FUNDO
                        </div>
                      )}
                    </td>
                    <td
                      className="py-4 px-2 text-xs whitespace-nowrap"
                      style={{ color: 'var(--ink-70)' }}
                    >
                      {t.event_id ? (
                        <>
                          <div>{t.events?.title ?? '—'}</div>
                          <div
                            className="mono text-[9px] mt-0.5"
                            style={{ color: 'var(--ink-50)' }}
                          >
                            {formatDateBr(t.events?.event_date)}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: 'var(--ink-50)' }}>—</span>
                      )}
                    </td>
                    <td
                      className="py-4 px-2 mono whitespace-nowrap text-xs"
                      style={{ color: 'var(--ink-70)' }}
                    >
                      {t.duration_hours != null
                        ? `${String(t.duration_hours).replace(/\.?0+$/, '')}h`
                        : '—'}
                    </td>
                    <td
                      className="py-4 px-2 mono text-xs"
                      style={{ color: 'var(--ink-70)' }}
                    >
                      {sigCountByTemplate[t.id] ?? 0}
                    </td>
                    <td className="py-4 px-2 text-right">
                      <Link
                        href={`/admin/certificados/template/${t.id}`}
                        className="mono text-[11px] tracking-[0.1em] inline-flex items-center gap-1 hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--azul)' }}
                      >
                        ABRIR <ArrowUpRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
