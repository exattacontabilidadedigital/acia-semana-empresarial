import { PenTool, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import SignatureCard from '@/components/admin/SignatureCard'
import SignatureForm from '@/components/admin/SignatureForm'
import Pagination from '@/components/ui/Pagination'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

export default async function AssinaturasPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string; pagina?: string }
}) {
  const supabase = createServerSupabaseClient()
  const page = Math.max(1, Number(searchParams.pagina) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const { data: signatures, count } = await supabase
    .from('certificate_signatures')
    .select('*', { count: 'exact' })
    .order('display_order', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1)
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="page-enter">
      <div className="mb-8">
        <div className="eyebrow mb-4">
          <span className="dot" />
          CONFIGURAÇÕES · ASSINATURAS
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
          Assinaturas
        </h1>
        <p
          className="mt-3"
          style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
        >
          Cadastre nomes, cargos e logos das pessoas que assinam os certificados.
          Use as mesmas assinaturas em vários templates — útil pra ACIA + parceiros.
        </p>
      </div>

      {searchParams.saved && (
        <div
          className="mb-5 p-3 rounded-xl text-sm flex items-center gap-2"
          style={{
            background: 'rgba(166,206,58,0.10)',
            border: '1px solid rgba(166,206,58,0.4)',
            color: '#3d5a0a',
          }}
        >
          <CheckCircle2 size={14} />
          Assinatura salva.
        </div>
      )}
      {searchParams.error && (
        <div
          className="mb-5 p-3 rounded-xl text-sm flex items-center gap-2"
          style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#b91c1c',
          }}
        >
          <AlertCircle size={14} />
          {searchParams.error}
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div
          className="rounded-[20px] bg-white p-6"
          style={{ border: '1px solid var(--line)' }}
        >
          <div
            className="mono text-[10px] tracking-[0.14em] mb-4"
            style={{ color: 'var(--ink-50)' }}
          >
            {(signatures ?? []).length} CADASTRADAS
          </div>
          {(signatures ?? []).length === 0 ? (
            <div
              className="text-center py-12"
              style={{ color: 'var(--ink-50)' }}
            >
              <PenTool size={28} className="mx-auto mb-3" />
              <div className="mono text-[11px] tracking-[0.14em]">
                NENHUMA ASSINATURA CADASTRADA
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {(signatures ?? []).map((s: any) => (
                <SignatureCard key={s.id} signature={s} />
              ))}
            </div>
          )}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={count ?? 0}
            buildUrl={(p) => {
              const params = new URLSearchParams()
              if (p > 1) params.set('pagina', String(p))
              return params.toString() ? `?${params.toString()}` : '?'
            }}
          />
        </div>

        <aside
          className="rounded-[20px] bg-white p-6 lg:sticky lg:top-24 self-start"
          style={{ border: '1px solid var(--line)' }}
        >
          <div
            className="mono text-[10px] tracking-[0.14em] mb-4"
            style={{ color: 'var(--ink-50)' }}
          >
            NOVA ASSINATURA
          </div>
          <SignatureForm />
        </aside>
      </div>
    </div>
  )
}
