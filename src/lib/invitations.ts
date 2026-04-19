import { createAdminClient } from '@/lib/supabase/admin'

export type InvitationRole = 'owner' | 'member'

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    'http://localhost:3000'
  )
}

/**
 * Cria um convite e dispara o email do Supabase com magic link.
 * O redirectTo aponta para /convite/[token] que conclui a aceitação
 * uma vez que o usuário tenha sessão.
 *
 * Retorna { token } em sucesso, ou { error } em falha.
 */
export async function createInvitation(params: {
  organizationId: string
  email: string
  role: InvitationRole
  invitedBy: string
}): Promise<{ token?: string; error?: string }> {
  const admin = createAdminClient()
  const email = params.email.trim().toLowerCase()

  // Já é membro ativo? (resolve user_id por email via auth.admin)
  const userId = await findUserIdByEmail(email)
  if (userId) {
    const { data: existingMember } = await admin
      .from('organization_members')
      .select('id')
      .eq('organization_id', params.organizationId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()
    if (existingMember) {
      return { error: 'Esse email já é membro ativo desta organização.' }
    }
  }

  // Já tem convite pendente?
  const { data: existingInvite } = await admin
    .from('organization_invitations')
    .select('id, token, expires_at')
    .eq('organization_id', params.organizationId)
    .eq('email', email)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  let token = existingInvite?.token

  if (!token) {
    const { data: invite, error: invErr } = await admin
      .from('organization_invitations')
      .insert({
        organization_id: params.organizationId,
        email,
        role: params.role,
        invited_by: params.invitedBy,
      })
      .select('token')
      .single()

    if (invErr || !invite) {
      return { error: invErr?.message ?? 'Falha ao criar convite.' }
    }
    token = invite.token
  }

  const redirectTo = `${getSiteUrl()}/convite/${token}`

  // Se o email já existe, manda magic link; senão, convida.
  if (userId) {
    const { error: linkErr } = await admin.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
    })
    if (linkErr) {
      return { error: `Convite criado, mas falhou o envio: ${linkErr.message}` }
    }
  } else {
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    })
    if (inviteErr) {
      return { error: `Convite criado, mas falhou o envio: ${inviteErr.message}` }
    }
  }

  return { token }
}

/**
 * Busca user_id por email usando admin.listUsers.
 * Retorna null se não existir.
 */
async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (error || !data?.users) return null
  const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  return match?.id ?? null
}

/**
 * Conclui a aceitação do convite. Deve ser chamado SERVER-SIDE com o usuário
 * já autenticado (sessão pelo magic link).
 *
 * - Valida token
 * - Confere expiração
 * - Confere que o email da sessão bate com o email do convite
 * - Insere organization_members (idempotente)
 * - Marca accepted_at
 * - Garante role 'partner' em users_roles
 */
export async function acceptInvitation(params: {
  token: string
  userId: string
  userEmail: string
}): Promise<{ organizationId?: string; error?: string }> {
  const admin = createAdminClient()

  const { data: invite, error: invErr } = await admin
    .from('organization_invitations')
    .select('id, organization_id, email, role, expires_at, accepted_at, invited_by')
    .eq('token', params.token)
    .maybeSingle()

  if (invErr || !invite) {
    return { error: 'Convite não encontrado.' }
  }

  if (invite.accepted_at) {
    return { organizationId: invite.organization_id }
  }

  if (new Date(invite.expires_at) < new Date()) {
    return { error: 'Este convite expirou.' }
  }

  if (invite.email.toLowerCase() !== params.userEmail.toLowerCase()) {
    return {
      error: `Convite endereçado a ${invite.email}, mas você está logado como ${params.userEmail}.`,
    }
  }

  // Insere member (UPSERT: se já existe e foi removed, reativa)
  const { error: memberErr } = await admin
    .from('organization_members')
    .upsert(
      {
        organization_id: invite.organization_id,
        user_id: params.userId,
        role: invite.role,
        status: 'active',
        invited_by: invite.invited_by ?? null,
      },
      { onConflict: 'organization_id,user_id' }
    )

  if (memberErr) {
    return { error: `Falha ao adicionar membro: ${memberErr.message}` }
  }

  // Marca convite como aceito
  await admin
    .from('organization_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  // Garante role 'partner' em users_roles
  await ensurePartnerRole(params.userId)

  return { organizationId: invite.organization_id }
}

/**
 * Garante que o usuário tenha o role global 'partner' em users_roles.
 */
async function ensurePartnerRole(userId: string): Promise<void> {
  const admin = createAdminClient()
  const { data: role } = await admin
    .from('roles')
    .select('id')
    .eq('name', 'partner')
    .maybeSingle()
  if (!role) return

  await admin
    .from('users_roles')
    .upsert({ user_id: userId, role_id: role.id }, { onConflict: 'user_id,role_id' })
}

/**
 * Cancela um convite pendente.
 */
export async function cancelInvitation(token: string): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('organization_invitations')
    .delete()
    .eq('token', token)
    .is('accepted_at', null)
  if (error) return { error: error.message }
  return {}
}
