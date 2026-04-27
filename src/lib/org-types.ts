// Tipos e constantes puros — pode ser importado por client e server.
// Não usar nada de next/headers aqui.

export type OrgRole = 'owner' | 'operations' | 'financial' | 'viewer'

// Sinônimo legado: 'member' antes da migration 022 era equivalente a 'operations'.
// Mantido apenas para parsing de dados antigos que ainda possam aparecer no client.
export type OrgRoleStored = OrgRole | 'member'

export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  owner: 'Proprietário',
  operations: 'Operações',
  financial: 'Financeiro',
  viewer: 'Leitura',
}

export const ORG_ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  owner: 'Acesso total à organização: equipe, dados, eventos, finanças e configurações.',
  operations: 'Cria e edita eventos, gerencia inscrições, faz check-in, exporta listas.',
  financial: 'Vê pagamentos, processa cancelamentos e exporta relatórios financeiros.',
  viewer: 'Acesso apenas de leitura ao painel da organização.',
}

export function normalizeOrgRole(role: OrgRoleStored | string | null | undefined): OrgRole {
  if (role === 'member') return 'operations'
  if (role === 'owner' || role === 'operations' || role === 'financial' || role === 'viewer') {
    return role
  }
  return 'viewer'
}

export type OrganizationSummary = {
  id: string
  name: string
  slug: string
  type: string
  logo_url: string | null
  status: string
  role: OrgRole
}

export const ORG_TYPE_LABELS: Record<string, string> = {
  sistema_s: 'Sistema S',
  public_entity: 'Entidade Pública',
  private_company: 'Empresa Privada',
  ngo: 'ONG / Terceiro Setor',
  other: 'Outro',
}

export const ORG_STATUS_LABELS: Record<string, string> = {
  active: 'Ativa',
  suspended: 'Suspensa',
  archived: 'Arquivada',
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}
