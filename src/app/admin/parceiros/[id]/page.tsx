import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  CheckCircle,
  Clock,
  X,
  Crown,
  User as UserIcon,
} from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  ORG_STATUS_LABELS,
  ORG_TYPE_LABELS,
  ORG_ROLE_LABELS,
  normalizeOrgRole,
} from '@/lib/orgs'
import type { OrgRole } from '@/lib/org-types'
import { createInvitation, cancelInvitation } from '@/lib/invitations'
import { formatDateShort } from '@/lib/utils'

const ASSIGNABLE_ROLES: OrgRole[] = ['operations', 'financial', 'viewer', 'owner']

function parseRole(raw: unknown): OrgRole {
  const value = String(raw ?? '')
  if (value === 'owner' || value === 'operations' || value === 'financial' || value === 'viewer') {
    return value
  }
  return 'operations'
}

export const dynamic = 'force-dynamic'

async function setOrgStatusAction(formData: FormData) {
  'use server'
  const id = String(formData.get('id'))
  const status = String(formData.get('status'))
  if (!['active', 'suspended', 'archived'].includes(status)) return
  const admin = createAdminClient()
  await admin.from('organizations').update({ status }).eq('id', id)
  revalidatePath(`/admin/parceiros/${id}`)
  revalidatePath('/admin/parceiros')
}

async function resendInviteAction(formData: FormData) {
  'use server'
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const orgId = String(formData.get('org_id'))
  const email = String(formData.get('email'))
  const role = parseRole(formData.get('role'))

  await createInvitation({
    organizationId: orgId,
    email,
    role,
    invitedBy: user.id,
  })
  revalidatePath(`/admin/parceiros/${orgId}`)
}

async function cancelInviteAction(formData: FormData) {
  'use server'
  const token = String(formData.get('token'))
  const orgId = String(formData.get('org_id'))
  await cancelInvitation(token)
  revalidatePath(`/admin/parceiros/${orgId}`)
}

async function removeMemberAction(formData: FormData) {
  'use server'
  const memberId = String(formData.get('member_id'))
  const orgId = String(formData.get('org_id'))
  const admin = createAdminClient()
  await admin
    .from('organization_members')
    .update({ status: 'removed' })
    .eq('id', memberId)
  revalidatePath(`/admin/parceiros/${orgId}`)
}

async function updateMemberRoleAction(formData: FormData) {
  'use server'
  const memberId = String(formData.get('member_id'))
  const orgId = String(formData.get('org_id'))
  const newRole = parseRole(formData.get('role'))
  const admin = createAdminClient()

  if (newRole !== 'owner') {
    const { data: target } = await admin
      .from('organization_members')
      .select('role')
      .eq('id', memberId)
      .maybeSingle()
    if (target?.role === 'owner') {
      const { count } = await admin
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('role', 'owner')
        .eq('status', 'active')
      if ((count ?? 0) <= 1) {
        redirect(
          `/admin/parceiros/${orgId}?warn=${encodeURIComponent('Não é possível rebaixar o último proprietário.')}`
        )
      }
    }
  }

  await admin
    .from('organization_members')
    .update({ role: newRole })
    .eq('id', memberId)
    .eq('organization_id', orgId)

  revalidatePath(`/admin/parceiros/${orgId}`)
}

export default async function OrgDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { warn?: string; invited?: string }
}) {
  const admin = createAdminClient()

  const { data: org } = await admin
    .from('organizations')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (!org) notFound()

  const [{ data: members }, { data: invites }, { data: events }] =
    await Promise.all([
      admin
        .from('organization_members')
        .select(
          'id, role, status, joined_at, user_id, user_profiles:user_id ( full_name )'
        )
        .eq('organization_id', params.id)
        .eq('status', 'active')
        .order('joined_at', { ascending: true }),
      admin
        .from('organization_invitations')
        .select('id, email, role, token, expires_at, accepted_at, created_at')
        .eq('organization_id', params.id)
        .is('accepted_at', null)
        .order('created_at', { ascending: false }),
      admin
        .from('events')
        .select('id, title, status, event_date')
        .eq('organization_id', params.id)
        .order('event_date', { ascending: false }),
    ])

  // Resolver email dos membros via auth.admin.listUsers (paginado simples)
  const memberIds = (members ?? []).map((m: any) => m.user_id)
  const userEmails = await getUsersEmails(memberIds)

  const STATUS = org.status as keyof typeof ORG_STATUS_LABELS

  return (
    <div className="page-enter">
      <Link
        href="/admin/parceiros"
        className="mono text-[11px] tracking-[0.14em] inline-flex items-center gap-1 mb-6 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--ink-50)' }}
      >
        <ArrowLeft size={12} /> VOLTAR
      </Link>

      {/* Header */}
      <div className="mb-10 flex items-start gap-5 flex-wrap">
        <div
          className="rounded-2xl overflow-hidden grid place-items-center shrink-0"
          style={{
            width: 88,
            height: 88,
            background: 'var(--azul-50)',
            color: 'var(--azul)',
            border: '1px solid var(--line)',
          }}
        >
          {org.logo_url ? (
            <Image
              src={org.logo_url}
              alt={org.name}
              width={88}
              height={88}
              className="object-cover w-full h-full"
            />
          ) : (
            <Building2 size={32} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="eyebrow mb-3">
            <span className="dot" />
            {ORG_TYPE_LABELS[org.type] ?? org.type}
          </div>
          <h1
            className="display"
            style={{ fontSize: 'clamp(36px, 4.5vw, 48px)' }}
          >
            {org.name}
          </h1>
          <div
            className="mono text-[11px] tracking-[0.06em] mt-2"
            style={{ color: 'var(--ink-50)' }}
          >
            /{org.slug}
          </div>
        </div>
        <StatusPill status={org.status} />
      </div>

      {searchParams.invited && (
        <Banner color="success">
          Convite enviado por email. O owner deve clicar no link mágico para
          ativar o acesso.
        </Banner>
      )}
      {searchParams.warn && <Banner color="warning">{searchParams.warn}</Banner>}

      {/* Grid: dados + ações */}
      <div className="grid lg:grid-cols-3 gap-5 mb-8">
        <Card className="lg:col-span-2">
          <SectionTitle eyebrow="DADOS" title="Informações" />
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4 mt-5">
            <Detail icon={<Mail size={14} />} label="Email" value={org.email} />
            <Detail icon={<Phone size={14} />} label="Telefone" value={org.phone} />
            <Detail icon={<Globe size={14} />} label="Website" value={org.website} link />
            <Detail label="CNPJ" value={org.cnpj} />
            {org.description && (
              <div className="sm:col-span-2">
                <Detail label="Descrição" value={org.description} />
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <SectionTitle eyebrow="AÇÕES" title="Status" />
          <div className="mt-5 space-y-2">
            <form action={setOrgStatusAction}>
              <input type="hidden" name="id" value={org.id} />
              <input type="hidden" name="status" value="active" />
              <button
                type="submit"
                disabled={org.status === 'active'}
                className="btn btn-ghost w-full justify-center"
                style={
                  org.status === 'active'
                    ? { opacity: 0.5, pointerEvents: 'none' }
                    : undefined
                }
              >
                <CheckCircle size={14} /> Marcar como ativa
              </button>
            </form>
            <form action={setOrgStatusAction}>
              <input type="hidden" name="id" value={org.id} />
              <input type="hidden" name="status" value="suspended" />
              <button
                type="submit"
                disabled={org.status === 'suspended'}
                className="btn btn-ghost w-full justify-center"
                style={
                  org.status === 'suspended'
                    ? { opacity: 0.5, pointerEvents: 'none' }
                    : undefined
                }
              >
                <Clock size={14} /> Suspender
              </button>
            </form>
            <form action={setOrgStatusAction}>
              <input type="hidden" name="id" value={org.id} />
              <input type="hidden" name="status" value="archived" />
              <button
                type="submit"
                disabled={org.status === 'archived'}
                className="btn btn-ghost w-full justify-center"
                style={
                  org.status === 'archived'
                    ? { opacity: 0.5, pointerEvents: 'none' }
                    : undefined
                }
              >
                <X size={14} /> Arquivar
              </button>
            </form>
          </div>
        </Card>
      </div>

      {/* Membros */}
      <Card className="mb-5">
        <SectionTitle
          eyebrow={`${members?.length ?? 0} MEMBROS ATIVOS`}
          title="Equipe da organização"
        />
        {(!members || members.length === 0) && (
          <EmptyRow>NENHUM MEMBRO ATIVO</EmptyRow>
        )}
        {members && members.length > 0 && (
          <div className="overflow-x-auto -mx-2 mt-5">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['Nome', 'Email', 'Cargo', 'Entrada', ''].map((h) => (
                    <th
                      key={h}
                      className="mono text-[10px] tracking-[0.1em] py-3 px-2 font-medium uppercase"
                      style={{ color: 'var(--ink-50)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m: any) => {
                  const memberRole = normalizeOrgRole(m.role)
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td className="py-4 px-2 font-medium" style={{ color: 'var(--ink)' }}>
                        <div className="flex items-center gap-2">
                          {memberRole === 'owner' ? (
                            <Crown size={14} style={{ color: 'var(--laranja)' }} />
                          ) : (
                            <UserIcon size={14} style={{ color: 'var(--ink-50)' }} />
                          )}
                          {m.user_profiles?.full_name ?? '—'}
                        </div>
                      </td>
                      <td
                        className="py-4 px-2 mono text-[12px] truncate max-w-[240px]"
                        style={{ color: 'var(--ink-70)' }}
                        title={userEmails[m.user_id] ?? ''}
                      >
                        {userEmails[m.user_id] ?? '—'}
                      </td>
                      <td className="py-4 px-2">
                        <form action={updateMemberRoleAction} className="flex items-center gap-2">
                          <input type="hidden" name="member_id" value={m.id} />
                          <input type="hidden" name="org_id" value={org.id} />
                          <select
                            name="role"
                            defaultValue={memberRole}
                            className="admin-select px-2 py-1 rounded-md mono text-[11px] tracking-[0.06em]"
                          >
                            {ASSIGNABLE_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {ORG_ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="mono text-[10px] tracking-[0.1em] hover:opacity-70 transition-opacity"
                            style={{ color: 'var(--azul)' }}
                          >
                            SALVAR
                          </button>
                        </form>
                      </td>
                      <td
                        className="py-4 px-2 mono text-[11px] whitespace-nowrap"
                        style={{ color: 'var(--ink-50)' }}
                      >
                        {formatDateShort(m.joined_at)}
                      </td>
                      <td className="py-4 px-2 text-right">
                        {memberRole !== 'owner' && (
                          <form action={removeMemberAction}>
                            <input type="hidden" name="member_id" value={m.id} />
                            <input type="hidden" name="org_id" value={org.id} />
                            <button
                              type="submit"
                              className="mono text-[10px] tracking-[0.1em] hover:opacity-70 transition-opacity"
                              style={{ color: '#b91c1c' }}
                            >
                              REMOVER
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Convites pendentes */}
      <Card className="mb-5">
        <SectionTitle
          eyebrow={`${invites?.length ?? 0} PENDENTES`}
          title="Convites pendentes"
        />
        {(!invites || invites.length === 0) && (
          <EmptyRow>NENHUM CONVITE PENDENTE</EmptyRow>
        )}
        {invites && invites.length > 0 && (
          <div className="overflow-x-auto -mx-2 mt-5">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['Email', 'Cargo', 'Expira', ''].map((h) => (
                    <th
                      key={h}
                      className="mono text-[10px] tracking-[0.1em] py-3 px-2 font-medium uppercase"
                      style={{ color: 'var(--ink-50)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invites.map((inv: any) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td
                      className="py-4 px-2 mono text-[12px] truncate max-w-[240px]"
                      style={{ color: 'var(--ink)' }}
                      title={inv.email}
                    >
                      {inv.email}
                    </td>
                    <td className="py-4 px-2">
                      <RoleBadge role={inv.role} />
                    </td>
                    <td
                      className="py-4 px-2 mono text-[11px] whitespace-nowrap"
                      style={{ color: 'var(--ink-50)' }}
                    >
                      {formatDateShort(inv.expires_at)}
                    </td>
                    <td className="py-4 px-2 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <form action={resendInviteAction}>
                          <input type="hidden" name="org_id" value={org.id} />
                          <input type="hidden" name="email" value={inv.email} />
                          <input type="hidden" name="role" value={inv.role} />
                          <button
                            type="submit"
                            className="mono text-[10px] tracking-[0.1em] hover:opacity-70 transition-opacity"
                            style={{ color: 'var(--azul)' }}
                          >
                            REENVIAR
                          </button>
                        </form>
                        <form action={cancelInviteAction}>
                          <input type="hidden" name="token" value={inv.token} />
                          <input type="hidden" name="org_id" value={org.id} />
                          <button
                            type="submit"
                            className="mono text-[10px] tracking-[0.1em] hover:opacity-70 transition-opacity"
                            style={{ color: '#b91c1c' }}
                          >
                            CANCELAR
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Eventos */}
      <Card>
        <SectionTitle
          eyebrow={`${events?.length ?? 0} TOTAL`}
          title="Eventos da organização"
        />
        {(!events || events.length === 0) && (
          <EmptyRow>NENHUM EVENTO CADASTRADO</EmptyRow>
        )}
        {events && events.length > 0 && (
          <div className="overflow-x-auto -mx-2 mt-5">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['Título', 'Data', 'Status', ''].map((h) => (
                    <th
                      key={h}
                      className="mono text-[10px] tracking-[0.1em] py-3 px-2 font-medium uppercase"
                      style={{ color: 'var(--ink-50)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((ev: any) => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td
                      className="py-4 px-2 font-medium truncate max-w-[280px]"
                      style={{ color: 'var(--ink)' }}
                      title={ev.title}
                    >
                      {ev.title}
                    </td>
                    <td
                      className="py-4 px-2 mono text-[11px] whitespace-nowrap"
                      style={{ color: 'var(--ink-50)' }}
                    >
                      {formatDateShort(ev.event_date)}
                    </td>
                    <td className="py-4 px-2">
                      <EventStatusPill status={ev.status} />
                    </td>
                    <td className="py-4 px-2 text-right">
                      <Link
                        href={`/admin/eventos/${ev.id}/editar`}
                        className="mono text-[10px] tracking-[0.1em] hover:opacity-70 transition-opacity"
                        style={{ color: 'var(--azul)' }}
                      >
                        ABRIR
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

async function getUsersEmails(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {}
  const admin = createAdminClient()
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 })
  const map: Record<string, string> = {}
  for (const u of data?.users ?? []) {
    if (userIds.includes(u.id)) map[u.id] = u.email ?? ''
  }
  return map
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    active: { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a' },
    suspended: { bg: 'rgba(248,130,30,0.15)', color: '#b85d00' },
    archived: { bg: 'var(--paper-2)', color: 'var(--ink-50)' },
  }
  const s = styles[status] ?? styles.active
  return (
    <span
      className="mono inline-flex items-center px-3 py-1.5 rounded-full text-[11px] tracking-[0.1em] font-medium whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}
    >
      {(ORG_STATUS_LABELS[status] ?? status).toUpperCase()}
    </span>
  )
}

function RoleBadge({ role }: { role: string }) {
  const normalized = normalizeOrgRole(role)
  const styles: Record<OrgRole, { bg: string; color: string }> = {
    owner: { bg: 'rgba(248,130,30,0.15)', color: '#b85d00' },
    operations: { bg: 'var(--azul-50)', color: 'var(--azul)' },
    financial: { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a' },
    viewer: { bg: 'rgba(0,0,0,0.06)', color: 'var(--ink-70)' },
  }
  const { bg, color } = styles[normalized]
  return (
    <span
      className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium uppercase"
      style={{ background: bg, color }}
    >
      {ORG_ROLE_LABELS[normalized]}
    </span>
  )
}

function EventStatusPill({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    draft: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'RASCUNHO' },
    pending_approval: {
      bg: 'rgba(248,130,30,0.15)',
      color: '#b85d00',
      label: 'PENDENTE',
    },
    active: {
      bg: 'rgba(166,206,58,0.18)',
      color: '#3d5a0a',
      label: 'PUBLICADO',
    },
    rejected: { bg: '#fee2e2', color: '#991b1b', label: 'REJEITADO' },
    archived: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'ARQUIVADO' },
    inactive: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'INATIVO' },
  }
  const s = styles[status] ?? { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: status }
  return (
    <span
      className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}

function Card({
  className = '',
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={`rounded-[20px] bg-white p-7 ${className}`}
      style={{ border: '1px solid var(--line)' }}
    >
      {children}
    </div>
  )
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div
        className="mono text-[10px] tracking-[0.14em]"
        style={{ color: 'var(--ink-50)' }}
      >
        {eyebrow}
      </div>
      <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
        {title}
      </h2>
    </div>
  )
}

function Detail({
  icon,
  label,
  value,
  link,
}: {
  icon?: React.ReactNode
  label: string
  value: string | null
  link?: boolean
}) {
  return (
    <div>
      <dt
        className="mono text-[10px] tracking-[0.1em] mb-1 flex items-center gap-1"
        style={{ color: 'var(--ink-50)' }}
      >
        {icon}
        {label.toUpperCase()}
      </dt>
      <dd
        className="text-sm"
        style={{ color: value ? 'var(--ink)' : 'var(--ink-50)' }}
      >
        {value
          ? link
            ? (
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--azul)' }}
                className="hover:underline"
              >
                {value}
              </a>
            )
            : value
          : '—'}
      </dd>
    </div>
  )
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-center py-10 mt-5 mono text-[11px] tracking-[0.14em]"
      style={{ color: 'var(--ink-50)' }}
    >
      {children}
    </div>
  )
}

function Banner({
  color,
  children,
}: {
  color: 'success' | 'warning'
  children: React.ReactNode
}) {
  const styles =
    color === 'success'
      ? {
          bg: 'rgba(166,206,58,0.10)',
          border: '1px solid rgba(166,206,58,0.4)',
          color: '#3d5a0a',
        }
      : {
          bg: 'rgba(248,130,30,0.08)',
          border: '1px solid rgba(248,130,30,0.3)',
          color: '#b85d00',
        }
  return (
    <div
      className="mb-6 p-3 rounded-xl text-sm"
      style={{ background: styles.bg, border: styles.border, color: styles.color }}
    >
      {children}
    </div>
  )
}
