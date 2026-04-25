import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { confirmInscriptionAtomic } from '@/lib/inscriptions'
import { reportError } from '@/lib/observability'

export async function POST(request: Request) {
  try {
    // Validate webhook token
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN
    const authHeader = request.headers.get('asaas-access-token')

    if (webhookToken && authHeader !== webhookToken) {
      console.error('Webhook token inválido')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const supabase = createAdminClient()

    // Idempotência por event id do Asaas: se já vimos esse evento, ignora.
    // O Asaas costuma reenviar webhooks em caso de timeout/falha — sem essa proteção
    // poderíamos criar tickets duplicados.
    const eventId: string | null = body.id ?? null
    if (eventId) {
      const { data: existing } = await supabase
        .from('webhook_events')
        .select('id, processed')
        .eq('event_id', eventId)
        .maybeSingle()
      if (existing?.processed) {
        console.log(`[WEBHOOK] Evento ${eventId} já processado — ignorando duplicata`)
        return NextResponse.json({ received: true, duplicate: true })
      }
    }

    // Log webhook event (best-effort; tabela pode não ter event_id se migração não rodou)
    const { data: insertedEvent } = await supabase
      .from('webhook_events')
      .insert({
        event_id: eventId,
        event_type: body.event,
        payment_id: body.payment?.id || null,
        raw_body: body,
      })
      .select('id')
      .maybeSingle()

    console.log(`[WEBHOOK] Evento recebido: ${body.event} - Payment: ${body.payment?.id}`)

    // Process payment confirmation
    if (body.event === 'PAYMENT_CONFIRMED' || body.event === 'PAYMENT_RECEIVED') {
      const paymentId = body.payment?.id
      if (!paymentId) return NextResponse.json({ received: true })

      const { data: inscriptions } = await supabase
        .from('inscriptions')
        .select('*')
        .eq('payment_id', paymentId)

      if (!inscriptions || inscriptions.length === 0) {
        console.error('Inscrição não encontrada para payment_id:', paymentId)
        return NextResponse.json({ received: true })
      }

      // Confirma cada inscription de forma atômica (UPDATE WHERE payment_status='pending').
      // Race-safe: se webhook + polling/sync chegarem simultaneamente, só um efetivamente
      // confirma e cria tickets; o outro recebe `false` e segue adiante.
      for (const inscription of inscriptions) {
        await confirmInscriptionAtomic(supabase, inscription)
      }
    }

    // Marca evento como processado
    if (insertedEvent?.id) {
      await supabase
        .from('webhook_events')
        .update({ processed: true })
        .eq('id', insertedEvent.id)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    reportError(error, {
      scope: 'webhook.asaas',
      tags: { event_type: 'unknown' },
    })
    // Sempre 200 para Asaas não retentar indefinidamente — o erro já foi capturado
    return NextResponse.json({ received: true })
  }
}
