import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateOrderNumber } from '@/lib/utils'
import { generateAndUploadQRCode } from '@/lib/qrcode'

const freeInscriptionSchema = z.object({
  event_id: z.number().int(),
  nome: z.string().min(2),
  email: z.string().email(),
  cpf: z.string().min(11),
  telefone: z.string().min(10),
  cnpj: z.string().nullable().optional(),
  nome_empresa: z.string().nullable().optional(),
  cargo: z.string().nullable().optional(),
  cep: z.string().optional(),
  rua: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  complemento: z.string().nullable().optional(),
  quantity: z.number().int().min(1),
  is_half_price: z.boolean().optional().default(false),
  accepted_terms: z.literal(true),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = freeInscriptionSchema.parse(body)

    const supabase = createAdminClient()

    // Fetch event and verify it's free
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', data.event_id)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    if (event.price > 0) {
      return NextResponse.json(
        { error: 'Este evento não é gratuito' },
        { status: 400 }
      )
    }

    // Check available spots
    if (event.capacity > 0) {
      const { count } = await supabase
        .from('inscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', data.event_id)
        .in('payment_status', ['confirmed', 'free'])

      const totalAfter = (count || 0) + data.quantity
      if (totalAfter > event.capacity) {
        return NextResponse.json(
          { error: 'Não há vagas suficientes disponíveis' },
          { status: 400 }
        )
      }
    }

    const orderNumber = generateOrderNumber()
    const cpfClean = data.cpf.replace(/\D/g, '')
    const cnpjDigits = (data.cnpj ?? '').replace(/\D/g, '') || null

    // Generate QR code and upload to Storage
    const qrCodeDataUrl = await generateAndUploadQRCode(orderNumber)

    // Create inscription
    const { data: inscription, error: inscriptionError } = await supabase
      .from('inscriptions')
      .insert({
        event_id: data.event_id,
        order_number: orderNumber,
        nome: data.nome,
        email: data.email,
        cpf: cpfClean,
        cnpj: cnpjDigits,
        telefone: data.telefone,
        nome_empresa: data.nome_empresa || null,
        cargo: data.cargo || null,
        cep: data.cep || null,
        rua: data.rua || null,
        numero: data.numero || null,
        bairro: data.bairro || null,
        cidade: data.cidade || null,
        estado: data.estado || null,
        complemento: data.complemento || null,
        quantity: data.quantity,
        is_half_price: data.is_half_price,
        total_amount: 0,
        net_amount: 0,
        payment_status: 'free',
        accepted_terms: data.accepted_terms,
        qr_code: qrCodeDataUrl,
      })
      .select()
      .single()

    if (inscriptionError || !inscription) {
      console.error('Erro ao criar inscrição:', inscriptionError)
      return NextResponse.json(
        { error: 'Erro ao criar inscrição' },
        { status: 500 }
      )
    }

    // Atualiza dados pessoais nas inscrições anteriores do mesmo CPF
    await supabase
      .from('inscriptions')
      .update({
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        cnpj: cnpjDigits,
        nome_empresa: data.nome_empresa || null,
        cargo: data.cargo || null,
        cep: data.cep || null,
        rua: data.rua || null,
        numero: data.numero || null,
        bairro: data.bairro || null,
        cidade: data.cidade || null,
        estado: data.estado || null,
        complemento: data.complemento || null,
      })
      .eq('cpf', cpfClean)
      .neq('id', inscription.id)

    // Create tickets
    const tickets = []
    for (let i = 0; i < data.quantity; i++) {
      tickets.push({
        inscription_id: inscription.id,
        event_id: data.event_id,
        participant_name: data.nome,
        status: 'active',
      })
    }

    const { error: ticketsError } = await supabase
      .from('tickets')
      .insert(tickets)

    if (ticketsError) {
      console.error('Erro ao criar tickets:', ticketsError)
    }

    // Send confirmation email (async, don't block response)
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email/confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_number: orderNumber }),
    }).catch((e) => console.error('Erro ao enviar email:', e))

    return NextResponse.json({
      success: true,
      order_number: orderNumber,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Erro ao processar inscrição gratuita:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
