'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

// Conta cadastros de expositores com status 'pending' (aguardando aprovação).
// Usado no sidebar do admin pra mostrar badge de notificação.
export async function getPendingExhibitorsCount(): Promise<number> {
  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return 0

    const { count } = await supabase
      .from('exhibitors')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    return count ?? 0
  } catch {
    return 0
  }
}
