import Link from 'next/link'
import { ArrowUpRight, FileText, Shield } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatDateShort } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const SLUG_META: Record<string, { icon: any; description: string; publicPath: string }> = {
  terms: {
    icon: FileText,
    description: 'Regras de uso da plataforma e dos eventos.',
    publicPath: '/termos',
  },
  privacy: {
    icon: Shield,
    description: 'Política de tratamento de dados pessoais (LGPD).',
    publicPath: '/privacidade',
  },
}

export default async function AdminLegalPage() {
  const supabase = createServerSupabaseClient()
  const { data: docs } = await supabase
    .from('legal_documents')
    .select('id, slug, title, last_revision, updated_at')
    .order('slug', { ascending: true })

  // Conta seções por doc
  const docIds = (docs ?? []).map((d: any) => d.id)
  const sectionsByDoc: Record<number, number> = {}
  if (docIds.length > 0) {
    const { data } = await supabase
      .from('legal_document_sections')
      .select('document_id')
      .in('document_id', docIds)
    for (const s of data ?? []) {
      const k = (s as any).document_id as number
      sectionsByDoc[k] = (sectionsByDoc[k] ?? 0) + 1
    }
  }

  return (
    <div className="page-enter">
      <div className="mb-10">
        <div className="eyebrow mb-4">
          <span className="dot" />
          CONTEÚDO · DOCUMENTOS LEGAIS
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
          Termos e privacidade
        </h1>
        <p
          className="mt-3"
          style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
        >
          Edite o conteúdo dos documentos legais que aparecem em{' '}
          <code>/termos</code> e <code>/privacidade</code>.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {(docs ?? []).map((d: any) => {
          const meta = SLUG_META[d.slug] ?? { icon: FileText, description: '', publicPath: '/' }
          const Icon = meta.icon
          return (
            <Link
              key={d.id}
              href={`/admin/legal/${d.slug}`}
              className="rounded-[20px] bg-white p-7 transition-all hover:-translate-y-0.5 block"
              style={{ border: '1px solid var(--line)' }}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div
                  className="rounded-lg p-2.5"
                  style={{ background: 'var(--azul-50)', color: 'var(--azul)' }}
                >
                  <Icon size={18} />
                </div>
                <ArrowUpRight size={16} style={{ color: 'var(--ink-50)' }} />
              </div>
              <div
                className="mono text-[10px] tracking-[0.14em]"
                style={{ color: 'var(--ink-50)' }}
              >
                {d.slug.toUpperCase()}
              </div>
              <h2 className="display mt-1 mb-2" style={{ fontSize: 24, letterSpacing: '-0.02em' }}>
                {d.title}
              </h2>
              <p className="text-sm" style={{ color: 'var(--ink-70)' }}>
                {meta.description}
              </p>

              <div
                className="mt-5 pt-4 grid grid-cols-3 gap-2 text-center"
                style={{ borderTop: '1px solid var(--line)' }}
              >
                <div>
                  <div
                    className="display"
                    style={{ fontSize: 22, color: 'var(--ink)' }}
                  >
                    {sectionsByDoc[d.id] ?? 0}
                  </div>
                  <div
                    className="mono text-[9px] tracking-[0.14em] mt-1"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    SEÇÕES
                  </div>
                </div>
                <div>
                  <div
                    className="mono text-[10px] mt-1"
                    style={{ color: 'var(--ink-70)' }}
                  >
                    {d.last_revision ?? '—'}
                  </div>
                  <div
                    className="mono text-[9px] tracking-[0.14em] mt-1"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    REVISÃO
                  </div>
                </div>
                <div>
                  <div
                    className="mono text-[10px] mt-1"
                    style={{ color: 'var(--ink-70)' }}
                  >
                    {d.updated_at ? formatDateShort(d.updated_at) : '—'}
                  </div>
                  <div
                    className="mono text-[9px] tracking-[0.14em] mt-1"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    SALVO EM
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
