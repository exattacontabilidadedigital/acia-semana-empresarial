import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const validateCheckinSchema = z.union([
  z.object({ ticket_id: z.string().uuid() }),
  z.object({ cpf: z.string().min(11), event_id: z.string().uuid() }),
])

// GET - Chamado pelo QR code scan (redireciona ou retorna dados)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const order = searchParams.get('order')
  const group = searchParams.get('group')

  if (!order && !group) {
    return NextResponse.json({ error: 'order ou group obrigatório' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Busca por grupo (QR único para múltiplos eventos)
  if (group) {
    const { data: inscriptions } = await supabase
      .from('inscriptions')
      .select('id, order_number, nome, email, cpf, quantity, is_half_price, payment_status, event_id')
      .eq('purchase_group', group)
      .in('payment_status', ['confirmed', 'free'])

    if (!inscriptions || inscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhuma inscrição confirmada encontrada para este grupo',
      }, { status: 404 })
    }

    // Buscar eventos
    const eventIds = Array.from(new Set(inscriptions.map((i) => i.event_id)))
    const { data: events } = await supabase
      .from('events')
      .select('id, title, event_date, start_time, end_time, location')
      .in('id', eventIds)

    const eventMap = new Map((events ?? []).map((e) => [e.id, e]))

    // Buscar tickets
    const inscriptionIds = inscriptions.map((i) => i.id)
    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, inscription_id, event_id, status, checked_in_at')
      .in('inscription_id', inscriptionIds)

    const ticketsByInscription = new Map<number, any[]>()
    for (const t of tickets ?? []) {
      const arr = ticketsByInscription.get(t.inscription_id) ?? []
      arr.push(t)
      ticketsByInscription.set(t.inscription_id, arr)
    }

    return NextResponse.json({
      success: true,
      type: 'group',
      purchase_group: group,
      participant: {
        nome: inscriptions[0].nome,
        email: inscriptions[0].email,
        cpf: inscriptions[0].cpf,
      },
      inscriptions: inscriptions.map((i) => {
        const event = eventMap.get(i.event_id)
        const insTickets = ticketsByInscription.get(i.id) ?? []
        const activeTickets = insTickets.filter((t) => t.status === 'active')
        const usedTickets = insTickets.filter((t) => t.status === 'used')

        return {
          id: i.id,
          order_number: i.order_number,
          event: event ?? null,
          quantity: i.quantity,
          is_half_price: i.is_half_price,
          payment_status: i.payment_status,
          tickets_total: insTickets.length,
          tickets_active: activeTickets.length,
          tickets_used: usedTickets.length,
          tickets: insTickets.map((t) => ({
            id: t.id,
            status: t.status,
            checked_in_at: t.checked_in_at,
          })),
        }
      }),
    })
  }

  // Busca por order individual (compatibilidade)
  const { data: inscription } = await supabase
    .from('inscriptions')
    .select('id, order_number, nome, email, cpf, quantity, is_half_price, payment_status, event_id, purchase_group')
    .eq('order_number', order!)
    .in('payment_status', ['confirmed', 'free'])
    .single()

  if (!inscription) {
    return NextResponse.json({
      success: false,
      message: 'Inscrição não encontrada ou não confirmada',
    }, { status: 404 })
  }

  // Se tem purchase_group, redirecionar para grupo
  if (inscription.purchase_group) {
    return NextResponse.redirect(
      new URL(`/api/checkin/validate?group=${inscription.purchase_group}`, request.url)
    )
  }

  const { data: event } = await supabase
    .from('events')
    .select('id, title, event_date, start_time, end_time, location')
    .eq('id', inscription.event_id)
    .single()

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, status, checked_in_at')
    .eq('inscription_id', inscription.id)

  const activeTickets = (tickets ?? []).filter((t) => t.status === 'active')
  const usedTickets = (tickets ?? []).filter((t) => t.status === 'used')

  return NextResponse.json({
    success: true,
    type: 'order',
    participant: {
      nome: inscription.nome,
      email: inscription.email,
      cpf: inscription.cpf,
    },
    inscription: {
      id: inscription.id,
      order_number: inscription.order_number,
      event: event ?? null,
      quantity: inscription.quantity,
      is_half_price: inscription.is_half_price,
      payment_status: inscription.payment_status,
      tickets_total: (tickets ?? []).length,
      tickets_active: activeTickets.length,
      tickets_used: usedTickets.length,
      tickets: (tickets ?? []).map((t) => ({
        id: t.id,
        status: t.status,
        checked_in_at: t.checked_in_at,
      })),
    },
  })
}

// POST - Chamado pelo admin para fazer check-in de um ticket
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = validateCheckinSchema.parse(body)

    const supabase = createAdminClient()

    let tickets: any[] = []

    if ('ticket_id' in data) {
      const { data: ticket, error } = await supabase
        .from('tickets')
        .select('*, inscriptions(*, events(*))')
        .eq('id', data.ticket_id)
        .single()

      if (error || !ticket) {
        return NextResponse.json(
          { success: false, message: 'Ticket não encontrado' },
          { status: 404 }
        )
      }

      tickets = [ticket]
    } else {
      const cpfClean = data.cpf.replace(/\D/g, '')

      const { data: foundTickets, error } = await supabase
        .from('tickets')
        .select('*, inscriptions(*, events(*))')
        .eq('event_id', data.event_id)
        .eq('inscriptions.cpf', cpfClean)

      if (error || !foundTickets?.length) {
        return NextResponse.json(
          { success: false, message: 'Nenhum ticket encontrado para este CPF e evento' },
          { status: 404 }
        )
      }

      tickets = foundTickets.filter((t) => t.inscriptions !== null)

      if (tickets.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Nenhum ticket encontrado para este CPF e evento' },
          { status: 404 }
        )
      }
    }

    const ticket = tickets[0]

    if (ticket.status !== 'active') {
      return NextResponse.json({
        success: false,
        message:
          ticket.status === 'used'
            ? 'Este ticket já foi utilizado'
            : 'Este ticket não está ativo',
        ticket: {
          id: ticket.id,
          status: ticket.status,
          checked_in_at: ticket.checked_in_at,
        },
      })
    }

    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        status: 'used',
        checked_in_at: new Date().toISOString(),
      })
      .eq('id', ticket.id)

    if (updateError) {
      console.error('Erro ao atualizar ticket:', updateError)
      return NextResponse.json(
        { success: false, message: 'Erro ao realizar check-in' },
        { status: 500 }
      )
    }

    const inscription = ticket.inscriptions
    const event = inscription?.events

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        status: 'used',
        checked_in_at: new Date().toISOString(),
      },
      event: event
        ? {
            id: event.id,
            title: event.title,
            date: event.date,
            time: event.time,
            location: event.location,
          }
        : null,
      participant: {
        nome: inscription?.nome,
        email: inscription?.email,
        cpf: inscription?.cpf,
        nome_empresa: inscription?.nome_empresa,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Dados inválidos', errors: error.errors },
        { status: 400 }
      )
    }

    console.error('Erro ao validar check-in:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
