import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import CertificateTemplateForm from '@/components/admin/CertificateTemplateForm'

export const dynamic = 'force-dynamic'

export default async function NewTemplatePage() {
  const supabase = createServerSupabaseClient()

  const { data: events } = await supabase
    .from('events')
    .select('id, title, event_date')
    .order('event_date', { ascending: false })

  const { data: signatures } = await supabase
    .from('certificate_signatures')
    .select('id, name, role, organization, active')
    .eq('active', true)
    .order('display_order', { ascending: true })

  return (
    <div className="page-enter">
      <Link
        href="/admin/certificados/template"
        className="mono text-[11px] tracking-[0.14em] inline-flex items-center gap-1 mb-6 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--ink-50)' }}
      >
        <ArrowLeft size={12} /> VOLTAR PARA LISTA
      </Link>

      <div className="mb-8">
        <div className="eyebrow mb-3">
          <span className="dot" />
          CERTIFICADOS · NOVO TEMPLATE
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(32px, 4vw, 44px)' }}>
          Novo template
        </h1>
        <p
          className="mt-2 text-sm"
          style={{ color: 'var(--ink-70)', maxWidth: 560 }}
        >
          Configure o visual do certificado. Pra ser o template padrão (usado
          quando um evento não tem template próprio), deixe o campo "Evento"
          vazio.
        </p>
      </div>

      <CertificateTemplateForm
        template={null}
        events={(events as any[]) ?? []}
        signatures={(signatures as any[]) ?? []}
        linkedSignatureIds={new Set<number>()}
      />
    </div>
  )
}
