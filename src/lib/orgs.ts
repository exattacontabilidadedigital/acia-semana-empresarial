import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { OrgRole, OrganizationSummary } from '@/lib/org-types'

// Re-exports para conveniência (server pode importar tudo daqui).
// Client components devem importar de '@/lib/org-types' diretamente.
export type { OrgRole, OrganizationSummary } from '@/lib/org-types'
export {
  ORG_TYPE_LABELS,
  ORG_STATUS_LABELS,
  slugify,
} from '@/lib/org-types'

const ACTIVE_ORG_COOKIE = 'acia_active_org'

/**
 * Lista as organizações ativas do usuário logado, com a role dentro de cada uma.
 * Retorna [] se não houver usuário ou nenhum vínculo.
 */
export async function getUserOrgs(): Promise<OrganizationSummary[]> {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('organization_members')
    .select(
      'role, organizations:organization_id ( id, name, slug, type, logo_url, status )'
    )
    .eq('user_id', user.id)
    .eq('status', 'active')

  if (error || !data) return []

  return data
    .map((row: any) => {
      const org = row.organizations
      if (!org || org.status === 'archived') return null
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        type: org.type,
        logo_url: org.logo_url,
        status: org.status,
        role: row.role as OrgRole,
      }
    })
    .filter(Boolean) as OrganizationSummary[]
}

/**
 * Resolve qual org o usuário está visualizando agora.
 * Prioridade: cookie `acia_active_org` → primeira org da lista.
 * Retorna null se o usuário não tem nenhuma org.
 */
export async function getActiveOrg(): Promise<OrganizationSummary | null> {
  const orgs = await getUserOrgs()
  if (orgs.length === 0) return null

  const cookieStore = cookies()
  const preferred = cookieStore.get(ACTIVE_ORG_COOKIE)?.value

  if (preferred) {
    const match = orgs.find((o) => o.id === preferred)
    if (match) return match
  }

  return orgs[0]
}

/**
 * Server-side guard: garante que o usuário é OWNER da org ativa.
 * Redireciona para /parceiro/dashboard se não for.
 */
export async function requireOrgOwner(): Promise<OrganizationSummary> {
  const org = await getActiveOrg()
  if (!org) redirect('/parceiro/dashboard')
  if (org.role !== 'owner') redirect('/parceiro/dashboard')
  return org
}

/**
 * Server-side guard: garante que o usuário tem ao menos uma org.
 * Redireciona para / se não tiver vínculo nenhum.
 */
export async function requireActiveOrg(): Promise<OrganizationSummary> {
  const org = await getActiveOrg()
  if (!org) redirect('/')
  return org
}
