import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getActiveOrg } from '@/lib/orgs'
import { hasPermission, type OrgPermission } from '@/lib/permissions'
import type { OrganizationSummary } from '@/lib/org-types'

export type AuthFailure = { error: NextResponse }
export type AdminAuthSuccess = { user: { id: string; email: string | null }; isAdmin: true }
export type PartnerAuthSuccess = {
  user: { id: string; email: string | null }
  org: OrganizationSummary
  isAdmin: boolean
}

/**
 * Guard para route handlers que exigem admin global. Retorna um shape com
 * `error: NextResponse` em falhas (use `if ('error' in result) return result.error`).
 */
export async function requireAdminApi(): Promise<AdminAuthSuccess | AuthFailure> {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  }
  const { data: roles } = await supabase
    .from('users_roles')
    .select('roles(name)')
    .eq('user_id', user.id)
  const isAdmin = roles?.some((r: any) => r.roles?.name === 'admin') ?? false
  if (!isAdmin) {
    return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  }
  return { user: { id: user.id, email: user.email ?? null }, isAdmin: true }
}

/**
 * Guard para route handlers que exigem permissão na org ativa do usuário.
 * Admin global passa sempre. Caso contrário, valida a permissão funcional.
 */
export async function requirePartnerApi(
  perm: OrgPermission
): Promise<PartnerAuthSuccess | AuthFailure> {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  }

  // Admin global passa direto
  const { data: roles } = await supabase
    .from('users_roles')
    .select('roles(name)')
    .eq('user_id', user.id)
  const isAdmin = roles?.some((r: any) => r.roles?.name === 'admin') ?? false

  const org = await getActiveOrg()
  if (!org) {
    if (isAdmin) {
      // Admin sem org ativa — permite, mas o handler precisa lidar com isso
      return {
        user: { id: user.id, email: user.email ?? null },
        org: {
          id: '',
          name: 'ACIA',
          slug: 'acia',
          type: 'admin',
          logo_url: null,
          status: 'active',
          role: 'owner',
        },
        isAdmin: true,
      }
    }
    return { error: NextResponse.json({ error: 'no_org' }, { status: 403 }) }
  }

  if (!isAdmin && !hasPermission(org.role, perm)) {
    return { error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) }
  }

  return { user: { id: user.id, email: user.email ?? null }, org, isAdmin }
}
