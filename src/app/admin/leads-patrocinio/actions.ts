'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const STATUS_VALUES = [
  'new',
  'contacted',
  'qualified',
  'closed',
  'discarded',
] as const

// Conta leads de patrocínio ainda não trabalhados (status='new'). Usado no
// sidebar do admin pra mostrar badge de notificação.
export async function getNewLeadsCount(): Promise<number> {
  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return 0

    const { count } = await supabase
      .from('sponsorship_leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new')
    return count ?? 0
  } catch {
    return 0
  }
}

export async function updateLeadStatusAction(formData: FormData) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/leads-patrocinio')

  const id = String(formData.get('id'))
  const status = String(formData.get('status'))
  if (!STATUS_VALUES.includes(status as any)) return

  const admin = createAdminClient()
  const patch: Record<string, any> = { status }
  // Marca o admin que contatou no primeiro update pra "contacted"
  if (status === 'contacted') {
    patch.contacted_at = new Date().toISOString()
    patch.contacted_by = user.id
  }
  await admin.from('sponsorship_leads').update(patch).eq('id', id)

  revalidatePath('/admin/leads-patrocinio')
}

export async function updateLeadNotesAction(formData: FormData) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/leads-patrocinio')

  const id = String(formData.get('id'))
  const notes = String(formData.get('notes') ?? '').trim() || null

  const admin = createAdminClient()
  await admin.from('sponsorship_leads').update({ notes }).eq('id', id)

  revalidatePath('/admin/leads-patrocinio')
}

export async function deleteLeadAction(formData: FormData) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/leads-patrocinio')

  const id = String(formData.get('id'))
  const admin = createAdminClient()
  await admin.from('sponsorship_leads').delete().eq('id', id)

  revalidatePath('/admin/leads-patrocinio')
}
