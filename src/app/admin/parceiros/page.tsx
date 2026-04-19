import Link from 'next/link'
import Image from 'next/image'
import { Building2, ArrowUpRight } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ORG_TYPE_LABELS } from '@/lib/orgs'
import NovaOrgModal from '@/components/admin/NovaOrgModal'

export const dynamic = 'force-dynamic'

type OrgRow = {
  id: string
  name: string
  slug: string
  type: string
  status: string
  logo_url: string | null
  created_at: string
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active: {
    bg: 'rgba(166,206,58,0.18)',
    color: '#3d5a0a',
    label: 'ATIVA',
  },
  suspended: {
    bg: 'rgba(248,130,30,0.15)',
    color: '#b85d00',
    label: 'SUSPENSA',
  },
  archived: {
    bg: 'var(--paper-2)',
    color: 'var(--ink-50)',
    label: 'ARQUIVADA',
  },
}

export default async function AdminParceirosPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const supabase = createServerSupabaseClient()

  const [{ data: orgs }, { count: totalOrgs }, { count: activeOrgs }] =
    await Promise.all([
      supabase
        .from('organizations')
        .select('id, name, slug, type, status, logo_url, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('organizations').select('*', { count: 'exact', head: true }),
      supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
    ])

  // Counts por org (membros e eventos) — fetch agregado
  const orgIds = (orgs ?? []).map((o: OrgRow) => o.id)
  let membersByOrg: Record<string, number> = {}
  let eventsByOrg: Record<string, number> = {}

  if (orgIds.length > 0) {
    const [{ data: memberRows }, { data: eventRows }] = await Promise.all([
      supabase
        .from('organization_members')
        .select('organization_id')
        .in('organization_id', orgIds)
        .eq('status', 'active'),
      supabase
        .from('events')
        .select('organization_id')
        .in('organization_id', orgIds),
    ])

    for (const r of memberRows ?? []) {
      const k = (r as any).organization_id as string
      membersByOrg[k] = (membersByOrg[k] ?? 0) + 1
    }
    for (const r of eventRows ?? []) {
      const k = (r as any).organization_id as string
      eventsByOrg[k] = (eventsByOrg[k] ?? 0) + 1
    }
  }

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="eyebrow mb-4">
            <span className="dot" />
            CADASTROS · PARCEIROS
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
            Organizações
          </h1>
          <p
            className="mt-3"
            style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
          >
            Entidades parceiras (Sistema S, públicas, privadas) com equipes que
            promovem eventos durante a Semana Empresarial.
          </p>
        </div>
        <NovaOrgModal />
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
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <MiniStat
          label="TOTAL"
          value={totalOrgs ?? 0}
          accent="var(--azul)"
          accentBg="var(--azul-50)"
        />
        <MiniStat
          label="ATIVAS"
          value={activeOrgs ?? 0}
          accent="var(--verde-600)"
          accentBg="rgba(166,206,58,0.18)"
        />
        <MiniStat
          label="SUSPENSAS / ARQUIVADAS"
          value={(totalOrgs ?? 0) - (activeOrgs ?? 0)}
          accent="var(--ink-50)"
          accentBg="var(--paper-2)"
        />
      </div>

      {/* List card */}
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
              {orgs?.length ?? 0} REGISTROS
            </div>
            <h2
              className="display mt-1"
              style={{ fontSize: 22, letterSpacing: '-0.02em' }}
            >
              Lista de organizações
            </h2>
          </div>
        </div>

        {(!orgs || orgs.length === 0) && (
          <div
            className="text-center py-16 mono text-[11px] tracking-[0.14em]"
            style={{ color: 'var(--ink-50)' }}
          >
            NENHUMA ORGANIZAÇÃO CADASTRADA
          </div>
        )}

        {orgs && orgs.length > 0 && (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['Organização', 'Tipo', 'Equipe', 'Eventos', 'Status', ''].map(
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
                {orgs.map((org: OrgRow) => {
                  const status = STATUS_STYLES[org.status] ?? STATUS_STYLES.active
                  return (
                    <tr
                      key={org.id}
                      style={{ borderBottom: '1px solid var(--line)' }}
                    >
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="rounded-lg overflow-hidden grid place-items-center shrink-0"
                            style={{
                              width: 36,
                              height: 36,
                              background: 'var(--azul-50)',
                              color: 'var(--azul)',
                            }}
                          >
                            {org.logo_url ? (
                              <Image
                                src={org.logo_url}
                                alt={org.name}
                                width={36}
                                height={36}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <Building2 size={16} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div
                              className="font-semibold truncate"
                              style={{ color: 'var(--ink)' }}
                              title={org.name}
                            >
                              {org.name}
                            </div>
                            <div
                              className="mono text-[10px] tracking-[0.06em] truncate"
                              style={{ color: 'var(--ink-50)' }}
                            >
                              /{org.slug}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td
                        className="py-4 px-2 text-xs"
                        style={{ color: 'var(--ink-70)' }}
                      >
                        {ORG_TYPE_LABELS[org.type] ?? org.type}
                      </td>
                      <td
                        className="py-4 px-2 mono whitespace-nowrap"
                        style={{ color: 'var(--ink)' }}
                      >
                        {membersByOrg[org.id] ?? 0}
                      </td>
                      <td
                        className="py-4 px-2 mono whitespace-nowrap"
                        style={{ color: 'var(--ink)' }}
                      >
                        {eventsByOrg[org.id] ?? 0}
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
                          href={`/admin/parceiros/${org.id}`}
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
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  accent,
  accentBg,
}: {
  label: string
  value: number | string
  accent: string
  accentBg: string
}) {
  return (
    <div
      className="rounded-2xl bg-white p-4 flex items-center gap-3"
      style={{ border: '1px solid var(--line)' }}
    >
      <div
        className="rounded-lg p-2.5 shrink-0"
        style={{ background: accentBg, color: accent }}
      >
        <Building2 size={16} />
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
