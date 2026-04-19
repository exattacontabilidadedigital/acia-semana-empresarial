import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function NovaOrganizacaoRedirect() {
  redirect('/admin/parceiros')
}
