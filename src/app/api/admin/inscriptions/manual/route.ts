import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateAndUploadQRCode } from '@/lib/qrcode'
import { generateOrderNumber, generatePurchaseGroup } from '@/lib/utils'

const manualInscriptionSchema = z.object({
  event_id: z.number().int().positive(),
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  cpf: z.string().min(11, 'CPF inválido'),
  telefone: z.string().min(10, 'Telefone inválido'),
  quantity: z.number().int().min(1).max(20).default(1),
  is_half_price: z.boolean().default(false),
  payment_status: z.enum(['confirmed', 'free', 'pending']),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = manualInscriptionSchema.safeParse(body)

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors
      return NextResponse.json(
        { error: 'Dados inválidos', details: errors },
        { status: 400 }
      )
    }

    const data = parsed.data
    const supabase = createAdminClient()

    // Fetch event to calculate price
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, price, half_price')
      .eq('id', data.event_id)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
    }

    // Calculate total
    const unitPrice = data.is_half_price ? (event.price / 2) : event.price
    const totalAmount = data.payment_status === 'free' ? 0 : unitPrice * data.quantity

    const orderNumber = generateOrderNumber()
    const purchaseGroup = data.quantity > 1 ? generatePurchaseGroup() : null

    // Clean CPF (only digits)
    const cpfClean = data.cpf.replace(/\D/g, '')

    // Insert inscription
    const { data: inscription, error: insertError } = await supabase
      .from('inscriptions')
      .insert({
        event_id: data.event_id,
        order_number: orderNumber,
        nome: data.nome,
        email: data.email,
        cpf: cpfClean,
        telefone: data.telefone.replace(/\D/g, ''),
        quantity: data.quantity,
        is_half_price: data.is_half_price,
        total_amount: totalAmount,
        net_amount: totalAmount,
        payment_status: data.payment_status,
        purchase_group: purchaseGroup,
        accepted_terms: true,
      })
      .select()
      .single()

    if (insertError || !inscription) {
      console.error('[MANUAL] Erro ao inserir:', insertError)
      return NextResponse.json(
        { error: 'Erro ao criar inscrição' },
        { status: 500 }
      )
    }

    // If confirmed or free, generate QR code, tickets, and send email
    if (data.payment_status === 'confirmed' || data.payment_status === 'free') {
      const qrIdentifier = purchaseGroup || orderNumber
      const qrType = purchaseGroup ? 'group' : 'order'
      const qrCodeUrl = await generateAndUploadQRCode(qrIdentifier, qrType as 'group' | 'order')

      // Update inscription with QR code
      await supabase
        .from('inscriptions')
        .update({ qr_code: qrCodeUrl })
        .eq('id', inscription.id)

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
      await supabase.from('tickets').insert(tickets)

      // Send confirmation email (fire and forget)
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email/confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: orderNumber }),
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      order_number: orderNumber,
      message: `Inscrição criada com sucesso (${orderNumber})`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[MANUAL] Erro:', message, error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
