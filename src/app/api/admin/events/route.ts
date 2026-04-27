import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminApi } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi()
    if ('error' in auth) return auth.error

    const { action, event_id } = await request.json()

    if (!action || !event_id) {
      return NextResponse.json({ error: 'action e event_id obrigatórios' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // ==================== DUPLICAR EVENTO ====================
    if (action === 'duplicate') {
      const { data: event, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', event_id)
        .single()

      if (fetchError || !event) {
        return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
      }

      // Remove id, created_at, updated_at and set new values
      const { id, created_at, updated_at, ...eventData } = event

      const { data: newEvent, error: insertError } = await supabase
        .from('events')
        .insert({
          ...eventData,
          title: `${event.title} (Cópia)`,
          status: 'draft',
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('[ADMIN] Erro ao duplicar evento:', insertError)
        return NextResponse.json({ error: 'Erro ao duplicar evento' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `Evento duplicado com sucesso (ID: ${newEvent.id})`,
        new_event_id: newEvent.id,
      })
    }

    // ==================== TOGGLE STATUS ====================
    if (action === 'toggle_status') {
      const { data: event, error: fetchError } = await supabase
        .from('events')
        .select('id, status')
        .eq('id', event_id)
        .single()

      if (fetchError || !event) {
        return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
      }

      const newStatus = event.status === 'active' ? 'closed' : 'active'
      const statusLabel = newStatus === 'active' ? 'Ativo' : 'Encerrado'

      const { error: updateError } = await supabase
        .from('events')
        .update({ status: newStatus })
        .eq('id', event_id)

      if (updateError) {
        console.error('[ADMIN] Erro ao alterar status:', updateError)
        return NextResponse.json({ error: 'Erro ao alterar status' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `Status alterado para ${statusLabel}`,
        new_status: newStatus,
      })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[ADMIN] Erro:', message, error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
