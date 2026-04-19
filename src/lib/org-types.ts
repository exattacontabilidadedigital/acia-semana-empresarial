// Tipos e constantes puros — pode ser importado por client e server.
// Não usar nada de next/headers aqui.

export type OrgRole = 'owner' | 'member'

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
