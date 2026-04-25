import Link from 'next/link'
import { Award, ArrowUpRight, Settings } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import CertificadosClient from './CertificadosClient'

export const dynamic = 'force-dynamic'

export default async function AdminCertificadosPage({
  searchParams,
}: {
  searchParams: { event_id?: string }
}) {
  const supabase = createServerSupabaseClient()
  const eventIdParam = searchParams.event_id
    ? Number(searchParams.event_id)
    : null

  // Lista eventos finalizados / passados
  const { data: events } = await supabase
    .from('events')
    .select('id, title, event_date, status, duration_hours')
    .or(`status.eq.finalizado,event_date.lt.${new Date().toISOString().slice(0, 10)}`)
    .order('event_date', { ascending: false })

  // Lista elegíveis pro evento selecionado
  let eligible: any[] = []
  if (eventIdParam) {
    const { data } = await supabase
      .from('eligible_certificates')
      .select('*')
      .eq('event_id', eventIdParam)
      .order('participant_name', { ascending: true })
    eligible = data ?? []
  }

  return (
    <div className="page-enter">
      <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="eyebrow mb-4">
            <span className="dot" />
            CERTIFICADOS · EMISSÃO
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
            Certificados
          </h1>
          <p
            className="mt-3"
            style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
          >
            Emite certificados de participação pra inscritos que fizeram check-in
            em eventos já encerrados. Pode emitir individual ou em massa, e enviar
            por email.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/admin/certificados/template"
            className="btn btn-ghost btn-lg"
          >
            <Settings size={14} /> Template
          </Link>
        </div>
      </div>

      <CertificadosClient
        events={(events as any[]) ?? []}
        selectedEventId={eventIdParam}
        eligible={eligible}
      />
    </div>
  )
}
