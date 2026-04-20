import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import LegalDocumentEditor from '@/components/admin/LegalDocumentEditor'

export const dynamic = 'force-dynamic'

const ALLOWED_SLUGS = ['terms', 'privacy'] as const
const PUBLIC_PATH: Record<string, string> = {
  terms: '/termos',
  privacy: '/privacidade',
}

export default async function EditLegalDocPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { saved?: string; error?: string }
}) {
  if (!ALLOWED_SLUGS.includes(params.slug as any)) notFound()

  const supabase = createServerSupabaseClient()

  const { data: doc } = await supabase
    .from('legal_documents')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!doc) notFound()

  const { data: sections } = await supabase
    .from('legal_document_sections')
    .select('id, number, title, body, order_index')
    .eq('document_id', doc.id)
    .order('order_index', { ascending: true })

  return (
    <div className="page-enter">
      <Link
        href="/admin/legal"
        className="mono text-[11px] tracking-[0.14em] inline-flex items-center gap-1 mb-6 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--ink-50)' }}
      >
        <ArrowLeft size={12} /> VOLTAR
      </Link>

      <div className="mb-8">
        <div className="eyebrow mb-4">
          <span className="dot" />
          DOCUMENTOS LEGAIS · {doc.slug.toUpperCase()}
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(36px, 4.5vw, 48px)' }}>
          {doc.title}
        </h1>
      </div>

      {searchParams.saved && (
        <Banner color="success">
          Salvo. Veja em{' '}
          <Link
            href={PUBLIC_PATH[doc.slug]}
            target="_blank"
            className="underline font-semibold"
            style={{ color: '#3d5a0a' }}
          >
            {PUBLIC_PATH[doc.slug]}
          </Link>
        </Banner>
      )}
      {searchParams.error && <Banner color="error">{searchParams.error}</Banner>}

      <LegalDocumentEditor
        documentId={doc.id}
        slug={doc.slug}
        publicPath={PUBLIC_PATH[doc.slug]}
        initialDoc={{
          title: doc.title,
          eyebrow: doc.eyebrow,
          last_revision: doc.last_revision,
          intro: doc.intro,
        }}
        initialSections={(sections ?? []).map((s: any) => ({
          id: s.id,
          number: s.number ?? '',
          title: s.title ?? '',
          body: s.body ?? '',
          order_index: s.order_index ?? 0,
        }))}
      />
    </div>
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
