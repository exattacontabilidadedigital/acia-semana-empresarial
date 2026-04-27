import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Crown, User as UserIcon, Mail } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireOrgOwner, ORG_ROLE_LABELS, normalizeOrgRole } from '@/lib/orgs'
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

async function inviteMemberAction(formData: FormData) {
  'use server'
  const org = await requireOrgOwner()
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const role = parseRole(formData.get('role'))

  if (!email) {
    redirect(`/parceiro/equipe?error=${encodeURIComponent('Email é obrigatório.')}`)
  }

  const result = await createInvitation({
    organizationId: org.id,
    email,
    role,
    invitedBy: user.id,
  })

  if (result.error) {
    redirect(`/parceiro/equipe?error=${encodeURIComponent(result.error)}`)
  }

  revalidatePath('/parceiro/equipe')
  redirect('/parceiro/equipe?invited=1')
}

async function removeMemberAction(formData: FormData) {
  'use server'
  await requireOrgOwner()
  const memberId = String(formData.get('member_id'))
  const admin = createAdminClient()
  await admin
    .from('organization_members')
    .update({ status: 'removed' })
    .eq('id', memberId)
  revalidatePath('/parceiro/equipe')
}

async function resendInviteAction(formData: FormData) {
  'use server'
  const org = await requireOrgOwner()
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const email = String(formData.get('email'))
  const role = parseRole(formData.get('role'))
  await createInvitation({
    organizationId: org.id,
    email,
    role,
    invitedBy: user.id,
  })
  revalidatePath('/parceiro/equipe')
}

async function cancelInviteAction(formData: FormData) {
  'use server'
  await requireOrgOwner()
  const token = String(formData.get('token'))
  await cancelInvitation(token)
  revalidatePath('/parceiro/equipe')
}

async function updateRoleAction(formData: FormData) {
  'use server'
  const org = await requireOrgOwner()
  const memberId = String(formData.get('member_id'))
  const newRole = parseRole(formData.get('role'))
  const admin = createAdminClient()

  // Não permite remover o último owner: garantia server-side.
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
        .eq('organization_id', org.id)
        .eq('role', 'owner')
        .eq('status', 'active')
      if ((count ?? 0) <= 1) {
        redirect(
          `/parceiro/equipe?error=${encodeURIComponent('Não é possível rebaixar o último proprietário da organização.')}`
        )
      }
    }
  }

  await admin
    .from('organization_members')
    .update({ role: newRole })
    .eq('id', memberId)
    .eq('organization_id', org.id)

  revalidatePath('/parceiro/equipe')
}

export default async function EquipePage({
  searchParams,
}: {
  searchParams: { error?: string; invited?: string }
}) {
  const org = await requireOrgOwner()
  const admin = createAdminClient()

  const [{ data: members }, { data: invites }] = await Promise.all([
    admin
      .from('organization_members')
      .select(
        'id, role, status, joined_at, user_id, user_profiles:user_id ( full_name )'
      )
      .eq('organization_id', org.id)
      .eq('status', 'active')
      .order('joined_at', { ascending: true }),
    admin
      .from('organization_invitations')
      .select('id, email, role, token, expires_at, accepted_at, created_at')
      .eq('organization_id', org.id)
      .is('accepted_at', null)
      .order('created_at', { ascending: false }),
  ])

  const memberIds = (members ?? []).map((m: any) => m.user_id)
  const userEmails: Record<string, string> = {}
  if (memberIds.length > 0) {
    const { data } = await admin.auth.admin.listUsers({ perPage: 200 })
    for (const u of data?.users ?? []) {
      if (memberIds.includes(u.id)) userEmails[u.id] = u.email ?? ''
    }
  }

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="mb-10">
        <div className="eyebrow mb-4">
          <span className="dot" />
          PORTAL · EQUIPE
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
          Equipe da organização
        </h1>
        <p
          className="mt-3"
          style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
        >
          Convide membros para gerenciar eventos, inscritos e fazer check-in junto
          com você. Eles recebem o convite por email.
        </p>
      </div>

      {searchParams.error && (
        <Banner color="error">{searchParams.error}</Banner>
      )}
      {searchParams.invited && (
        <Banner color="success">
          Convite enviado por email. O destinatário recebe o link mágico em
          instantes.
        </Banner>
      )}

      {/* Convidar */}
      <Card className="mb-5">
        <SectionTitle eyebrow="NOVO CONVITE" title="Convidar membro" />
        <form action={inviteMemberAction} className="grid sm:grid-cols-[1fr_180px_auto] gap-3 mt-5">
          <label className="block">
            <span
              className="mono block text-[10px] tracking-[0.1em] mb-2"
              style={{ color: 'var(--ink-50)' }}
            >
              EMAIL
            </span>
            <input
              name="email"
              type="email"
              required
              placeholder="pessoa@empresa.com"
              className="admin-input w-full px-4 py-3 rounded-xl text-sm"
            />
          </label>
          <label className="block">
            <span
              className="mono block text-[10px] tracking-[0.1em] mb-2"
              style={{ color: 'var(--ink-50)' }}
            >
              CARGO
            </span>
            <select
              name="role"
              defaultValue="operations"
              className="admin-select w-full px-4 py-3 rounded-xl text-sm"
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ORG_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button type="submit" className="btn btn-orange btn-lg w-full justify-center">
              <Mail size={14} /> Enviar
            </button>
          </div>
        </form>
      </Card>

      {/* Membros */}
      <Card className="mb-5">
        <SectionTitle
          eyebrow={`${members?.length ?? 0} ATIVOS`}
          title="Membros"
        />
        {(!members || members.length === 0) && (
          <Empty>NENHUM MEMBRO AINDA</Empty>
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
                        <form action={updateRoleAction} className="flex items-center gap-2">
                          <input type="hidden" name="member_id" value={m.id} />
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

      {/* Convites */}
      <Card>
        <SectionTitle
          eyebrow={`${invites?.length ?? 0} PENDENTES`}
          title="Convites pendentes"
        />
        {(!invites || invites.length === 0) && (
          <Empty>NENHUM CONVITE PENDENTE</Empty>
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
    </div>
  )
}

function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
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

function Empty({ children }: { children: React.ReactNode }) {
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
  color: 'success' | 'error'
  children: React.ReactNode
}) {
  const styles =
    color === 'success'
      ? {
          bg: 'rgba(166,206,58,0.10)',
          border: '1px solid rgba(166,206,58,0.4)',
          color: '#3d5a0a',
        }
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
