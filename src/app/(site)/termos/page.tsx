import { createServerSupabaseClient } from '@/lib/supabase/server'
import LegalDocumentView, {
  type LegalSection,
} from '@/components/site/LegalDocumentView'

export const metadata = {
  title: 'Termos de Uso | Semana Empresarial de Açailândia 2026',
}

export const dynamic = 'force-dynamic'

export default async function TermosPage() {
  const supabase = createServerSupabaseClient()

  const { data: doc } = await supabase
    .from('legal_documents')
    .select('id, title, eyebrow, last_revision, intro')
    .eq('slug', 'terms')
    .maybeSingle()

  const sections: LegalSection[] = doc
    ? (
        await supabase
          .from('legal_document_sections')
          .select('number, title, body, order_index')
          .eq('document_id', doc.id)
          .order('order_index', { ascending: true })
      ).data?.map((s: any) => ({
        number: s.number,
        title: s.title,
        body: s.body ?? '',
      })) ?? []
    : []

  return (
    <LegalDocumentView
      title={doc?.title ?? 'Termos de uso'}
      eyebrow={doc?.eyebrow ?? 'DOCUMENTOS LEGAIS'}
      lastRevision={doc?.last_revision ?? null}
      intro={doc?.intro ?? null}
      sections={sections}
      bottomLink={{ href: '/privacidade', label: 'VER POLÍTICA DE PRIVACIDADE' }}
    />
  )
}
