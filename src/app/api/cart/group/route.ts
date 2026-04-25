import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const group = searchParams.get('group')

  if (!group) {
    return NextResponse.json({ error: 'Group required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: inscriptions } = await supabase
    .from('inscriptions')
    .select('*')
    .eq('purchase_group', group)
    .order('created_at', { ascending: true })

  if (!inscriptions || inscriptions.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Fetch events
  const eventIds = Array.from(new Set(inscriptions.map((i) => i.event_id)))
  const { data: events } = await supabase
    .from('events')
    .select('id, title, event_date, start_time, end_time, location')
    .in('id', eventIds)

  const eventMap = new Map((events ?? []).map((e) => [e.id, e]))

  // Fetch tickets
  const inscriptionIds = inscriptions.map((i) => i.id)
  const { data: allTickets } = await supabase
    .from('tickets')
    .select('id, inscription_id, participant_name')
    .in('inscription_id', inscriptionIds)
    .order('created_at', { ascending: true })

  const ticketsByInscription = new Map<number, Array<{ id: string; participant_name: string }>>()
  for (const ticket of allTickets ?? []) {
    const existing = ticketsByInscription.get(ticket.inscription_id) ?? []
    existing.push({ id: ticket.id, participant_name: ticket.participant_name })
    ticketsByInscription.set(ticket.inscription_id, existing)
  }

  const result = inscriptions.map((i) => ({
    id: i.id,
    order_number: i.order_number,
    nome: i.nome,
    email: i.email,
    cpf: i.cpf,
    quantity: i.quantity,
    is_half_price: i.is_half_price,
    total_amount: i.total_amount,
    payment_status: i.payment_status,
    payment_url: i.payment_url,
    qr_code: i.qr_code,
    event: eventMap.get(i.event_id) ?? null,
    tickets: ticketsByInscription.get(i.id) ?? [],
  }))

  return NextResponse.json({ inscriptions: result })
}
