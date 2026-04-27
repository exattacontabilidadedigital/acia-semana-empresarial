import { redirect } from 'next/navigation'
import type { OrgRole, OrganizationSummary } from '@/lib/org-types'
import { getActiveOrg } from '@/lib/orgs'

// Permissões granulares dentro de uma organização parceira.
// O mapeamento role → permissions vive aqui (espelho do que a RLS aplica
// no banco). Use `requirePermission` em server actions / API routes como
// segunda linha de defesa — RLS é a primeira.
export type OrgPermission =
  | 'manage_events'
  | 'view_inscriptions'
  | 'do_checkin'
  | 'view_payments'
  | 'manage_cancellations'
  | 'export_data'
  | 'upload_materials'
  | 'manage_team'
  | 'edit_org_settings'

const OPERATIONS: OrgPermission[] = [
  'manage_events',
  'view_inscriptions',
  'do_checkin',
  'export_data',
  'upload_materials',
]

const FINANCIAL: OrgPermission[] = [
  'view_payments',
  'manage_cancellations',
  'export_data',
  'view_inscriptions',
]

const VIEWER: OrgPermission[] = ['view_inscriptions']

const OWNER: OrgPermission[] = [
  'manage_events',
  'view_inscriptions',
  'do_checkin',
  'view_payments',
  'manage_cancellations',
  'export_data',
  'upload_materials',
  'manage_team',
  'edit_org_settings',
]

export const PERMISSION_MAP: Record<OrgRole, OrgPermission[]> = {
  owner: OWNER,
  operations: OPERATIONS,
  financial: FINANCIAL,
  viewer: VIEWER,
}

export function hasPermission(role: OrgRole, perm: OrgPermission): boolean {
  return PERMISSION_MAP[role]?.includes(perm) ?? false
}

/**
 * Server-side guard: garante que o usuário tem a permissão na org ativa.
 * Redireciona para /parceiro/dashboard se não tiver.
 */
export async function requirePermission(
  perm: OrgPermission
): Promise<OrganizationSummary> {
  const org = await getActiveOrg()
  if (!org) redirect('/')
  if (!hasPermission(org.role, perm)) {
    redirect('/parceiro/dashboard')
  }
  return org
}

/**
 * Versão non-throwing: retorna a org se permitido, ou null se não.
 * Útil em UIs que precisam decidir entre exibir ou esconder algo sem redirecionar.
 */
export async function checkPermission(
  perm: OrgPermission
): Promise<OrganizationSummary | null> {
  const org = await getActiveOrg()
  if (!org) return null
  if (!hasPermission(org.role, perm)) return null
  return org
}
