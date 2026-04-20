import { createServerSupabaseClient } from '@/lib/supabase/server'
import LegalDocumentView, {
  type LegalSection,
} from '@/components/site/LegalDocumentView'

export const metadata = {
  title: 'Política de Privacidade e LGPD | Semana Empresarial de Açailândia 2026',
}

export const dynamic = 'force-dynamic'

export default async function PrivacidadePage() {
  const supabase = createServerSupabaseClient()

  const { data: doc } = await supabase
    .from('legal_documents')
    .select('id, title, eyebrow, last_revision, intro')
    .eq('slug', 'privacy')
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
      title={doc?.title ?? 'Política de privacidade'}
      eyebrow={doc?.eyebrow ?? 'DOCUMENTOS LEGAIS · LGPD'}
      lastRevision={doc?.last_revision ?? null}
      intro={doc?.intro ?? null}
      sections={sections}
      bottomLink={{ href: '/termos', label: 'VER TERMOS DE USO' }}
    />
  )
}
