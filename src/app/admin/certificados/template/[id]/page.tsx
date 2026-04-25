import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import CertificateTemplateForm from '@/components/admin/CertificateTemplateForm'

export const dynamic = 'force-dynamic'

export default async function TemplateEditPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { saved?: string }
}) {
  const supabase = createServerSupabaseClient()
  const id = Number(params.id)
  if (!Number.isFinite(id)) notFound()

  const { data: template } = await supabase
    .from('certificate_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!template) notFound()

  const { data: events } = await supabase
    .from('events')
    .select('id, title, event_date')
    .order('event_date', { ascending: false })

  const { data: signatures } = await supabase
    .from('certificate_signatures')
    .select('id, name, role, organization, active')
    .eq('active', true)
    .order('display_order', { ascending: true })

  const { data: linkedSigs } = await supabase
    .from('certificate_template_signatures')
    .select('signature_id')
    .eq('template_id', id)
  const linkedIds = new Set(
    (linkedSigs ?? []).map((s: any) => s.signature_id)
  )

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
          CERTIFICADOS · EDITAR TEMPLATE
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(32px, 4vw, 44px)' }}>
          {(template as any).name}
        </h1>
        {(template as any).event_id === null && (
          <p
            className="mt-2 text-sm"
            style={{ color: 'var(--ink-50)' }}
          >
            Este é o template padrão — usado quando o evento não tem template específico.
          </p>
        )}
      </div>

      {searchParams.saved && (
        <div
          className="mb-5 p-3 rounded-xl text-sm"
          style={{
            background: 'rgba(166,206,58,0.10)',
            border: '1px solid rgba(166,206,58,0.4)',
            color: '#3d5a0a',
          }}
        >
          Template salvo.
        </div>
      )}

      <CertificateTemplateForm
        template={template as any}
        events={(events as any[]) ?? []}
        signatures={(signatures as any[]) ?? []}
        linkedSignatureIds={linkedIds}
      />
    </div>
  )
}
