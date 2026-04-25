import Link from 'next/link'
import { Briefcase, ArrowUpRight, CheckCircle, XCircle, Hash } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import NovoAssociadoModal from '@/components/admin/NovoAssociadoModal'
import ImportarAssociadosModal from '@/components/admin/ImportarAssociadosModal'
import Pagination from '@/components/ui/Pagination'
import { formatDateShort } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

const STATUS_PILL: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a', label: 'ATIVO' },
  inactive: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'INATIVO' },
}

function formatCnpj(cnpj: string | null): string {
  const d = (cnpj ?? '').replace(/\D/g, '')
  if (d.length !== 14) return cnpj ?? '—'
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}

export default async function AdminAssociadosPage({
  searchParams,
}: {
  searchParams: { error?: string; busca?: string; status?: string; pagina?: string }
}) {
  const supabase = createServerSupabaseClient()

  const busca = (searchParams.busca ?? '').trim()
  const statusFilter = searchParams.status ?? ''
  const page = Math.max(1, Number(searchParams.pagina) || 1)
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('associates')
    .select(
      'id, razao_social, nome_fantasia, cnpj, segmento, status, cidade, estado, created_at',
      { count: 'exact' }
    )
    .order('razao_social', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1)

  if (statusFilter) query = query.eq('status', statusFilter)
  if (busca) {
    query = query.or(
      `razao_social.ilike.%${busca}%,nome_fantasia.ilike.%${busca}%,cnpj.ilike.%${busca}%`
    )
  }

  const [associatesResult, { count: totalAll }, { count: totalActive }] =
    await Promise.all([
      query,
      supabase.from('associates').select('*', { count: 'exact', head: true }),
      supabase
        .from('associates')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
    ])

  const associates = associatesResult.data
  const count = associatesResult.count
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="eyebrow mb-4">
            <span className="dot" />
            CADASTROS · ASSOCIADOS
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
            Associados
          </h1>
          <p
            className="mt-3"
            style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
          >
            Empresas membro da ACIA. Podem receber cupons de desconto exclusivos
            nos eventos da Semana Empresarial.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <ImportarAssociadosModal />
          <NovoAssociadoModal />
        </div>
      </div>

      {searchParams.error && (
        <div
          className="mb-6 p-3 rounded-xl text-sm"
          style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#b91c1c',
          }}
        >
          {searchParams.error}
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <MiniStat
          label="TOTAL"
          value={totalAll ?? 0}
          accent="var(--azul)"
          icon={<Hash size={14} />}
        />
        <MiniStat
          label="ATIVOS"
          value={totalActive ?? 0}
          accent="var(--verde-600)"
          icon={<CheckCircle size={14} />}
        />
        <MiniStat
          label="INATIVOS"
          value={(totalAll ?? 0) - (totalActive ?? 0)}
          accent="var(--ink-50)"
          icon={<XCircle size={14} />}
        />
      </div>

      {/* Filtros */}
      <form
        method="GET"
        className="rounded-[20px] bg-white p-5 mb-5"
        style={{ border: '1px solid var(--line)' }}
      >
        <div className="grid sm:grid-cols-[1fr_200px_auto] gap-4 items-end">
          <label className="block">
            <span
              className="mono block text-[10px] tracking-[0.1em] mb-2"
              style={{ color: 'var(--ink-50)' }}
            >
              BUSCAR (RAZÃO SOCIAL / FANTASIA / CNPJ)
            </span>
            <input
              name="busca"
              type="text"
              defaultValue={busca}
              placeholder="Digite parte do nome ou CNPJ..."
              className="admin-input w-full px-4 py-3 rounded-xl text-sm"
            />
          </label>
          <label className="block">
            <span
              className="mono block text-[10px] tracking-[0.1em] mb-2"
              style={{ color: 'var(--ink-50)' }}
            >
              STATUS
            </span>
            <select
              name="status"
              defaultValue={statusFilter}
              className="admin-select w-full px-4 py-3 rounded-xl text-sm"
            >
              <option value="">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </label>
          <button type="submit" className="btn btn-orange btn-lg">
            Filtrar
          </button>
        </div>
      </form>

      {/* Lista */}
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
              {associates?.length ?? 0} REGISTROS
            </div>
            <h2
              className="display mt-1"
              style={{ fontSize: 22, letterSpacing: '-0.02em' }}
            >
              Lista de associados
            </h2>
          </div>
        </div>

        {(!associates || associates.length === 0) && (
          <div
            className="text-center py-16 mono text-[11px] tracking-[0.14em]"
            style={{ color: 'var(--ink-50)' }}
          >
            NENHUM ASSOCIADO ENCONTRADO
          </div>
        )}

        {associates && associates.length > 0 && (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['Empresa', 'CNPJ', 'Segmento', 'Cidade', 'Cadastro', 'Status', ''].map(
                    (h) => (
                      <th
                        key={h}
                        className="mono text-[10px] tracking-[0.1em] py-3 px-2 font-medium uppercase"
                        style={{ color: 'var(--ink-50)' }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {associates.map((a: any) => {
                  const status = STATUS_PILL[a.status] ?? STATUS_PILL.inactive
                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="rounded-lg p-2 shrink-0"
                            style={{ background: 'var(--azul-50)', color: 'var(--azul)' }}
                          >
                            <Briefcase size={14} />
                          </div>
                          <div className="min-w-0">
                            <div
                              className="font-semibold truncate"
                              style={{ color: 'var(--ink)' }}
                              title={a.razao_social}
                            >
                              {a.nome_fantasia || a.razao_social}
                            </div>
                            {a.nome_fantasia && (
                              <div
                                className="text-xs truncate"
                                style={{ color: 'var(--ink-50)' }}
                                title={a.razao_social}
                              >
                                {a.razao_social}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td
                        className="py-4 px-2 mono text-[12px] whitespace-nowrap"
                        style={{ color: 'var(--ink-70)' }}
                      >
                        {formatCnpj(a.cnpj)}
                      </td>
                      <td
                        className="py-4 px-2 text-xs"
                        style={{ color: 'var(--ink-70)' }}
                      >
                        {a.segmento ?? '—'}
                      </td>
                      <td
                        className="py-4 px-2 text-xs whitespace-nowrap"
                        style={{ color: 'var(--ink-70)' }}
                      >
                        {a.cidade ? `${a.cidade}${a.estado ? '/' + a.estado : ''}` : '—'}
                      </td>
                      <td
                        className="py-4 px-2 mono text-[11px] whitespace-nowrap"
                        style={{ color: 'var(--ink-50)' }}
                      >
                        {formatDateShort(a.created_at)}
                      </td>
                      <td className="py-4 px-2">
                        <span
                          className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap"
                          style={{ background: status.bg, color: status.color }}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <Link
                          href={`/admin/associados/${a.id}`}
                          className="mono text-[11px] tracking-[0.1em] inline-flex items-center gap-1 hover:opacity-70 transition-opacity"
                          style={{ color: 'var(--azul)' }}
                        >
                          ABRIR <ArrowUpRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={count ?? 0}
          buildUrl={(p) => {
            const params = new URLSearchParams()
            if (searchParams.busca) params.set('busca', searchParams.busca)
            if (searchParams.status) params.set('status', searchParams.status)
            if (p > 1) params.set('pagina', String(p))
            return params.toString() ? `?${params.toString()}` : '?'
          }}
        />
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  accent,
  icon,
}: {
  label: string
  value: number
  accent: string
  icon: React.ReactNode
}) {
  return (
    <div
      className="rounded-2xl bg-white p-4 flex items-center gap-3"
      style={{ border: '1px solid var(--line)' }}
    >
      <div
        className="rounded-lg p-2.5 shrink-0"
        style={{ background: 'var(--paper-2)', color: accent }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div
          className="mono text-[10px] tracking-[0.14em] truncate"
          style={{ color: 'var(--ink-50)' }}
        >
          {label}
        </div>
        <div
          className="display"
          style={{ fontSize: 24, letterSpacing: '-0.02em', color: 'var(--ink)' }}
        >
          {value}
        </div>
      </div>
    </div>
  )
}
