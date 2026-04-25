import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCustomer, createPayment, getPaymentPixQrCode } from '@/lib/asaas'
import { generateOrderNumber, generatePurchaseGroup } from '@/lib/utils'
import { generateAndUploadQRCode } from '@/lib/qrcode'
import { validateCouponWithAssociate, applyCouponDiscount } from '@/lib/coupons'
import { reportError } from '@/lib/observability'

const cartItemSchema = z.object({
  event_id: z.number().int(),
  quantity: z.number().int().min(1),
  is_half_price: z.boolean().optional().default(false),
  coupon_code: z.string().optional(),
})

const participantPayloadSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  cpf: z.string().min(11),
  telefone: z.string().min(10),
  nome_empresa: z.string().nullable().optional(),
  cargo: z.string().nullable().optional(),
  cep: z.string().optional(),
  rua: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  complemento: z.string().nullable().optional(),
  accepted_terms: z.literal(true),
  event_ids: z.array(z.number().int()).optional(),
})

const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  cnpj: z.string().nullable().optional(),
  mode: z.enum(['single', 'multiple']).default('single'),
  participants: z.array(participantPayloadSchema).min(1),
  payment_method: z.enum(['PIX', 'BOLETO', 'CREDIT_CARD']).nullable().optional(),
})

type ParticipantPayload = z.infer<typeof participantPayloadSchema>
type CartItemPayload = z.infer<typeof cartItemSchema>

interface ParticipantSlot {
  participant: ParticipantPayload
  cpfClean: string
  /** Map de event_id → quantos slots desse evento foram alocados a este participante. */
  eventSlots: Map<number, number>
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = checkoutSchema.parse(body)

    const supabase = createAdminClient()
    const purchaseGroup = generatePurchaseGroup()
    const cnpjDigits = (data.cnpj ?? '').replace(/\D/g, '') || null

    // Fetch all events
    const eventIds = data.items.map((i) => i.event_id)
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .in('id', eventIds)

    if (!events || events.length !== eventIds.length) {
      return NextResponse.json({ error: 'Um ou mais eventos não foram encontrados' }, { status: 404 })
    }

    const eventMap = new Map(events.map((e) => [e.id, e]))
    const itemMap = new Map(data.items.map((i) => [i.event_id, i]))

    // Validate participant assignments and expand slots
    const slots = buildParticipantSlots(data.mode, data.participants, data.items)
    if ('error' in slots) {
      return NextResponse.json({ error: slots.error }, { status: 400 })
    }

    // Validate capacity / half-price / coupons per event (somando todos os slots)
    interface EventProcessing {
      event_id: number
      unitPrice: number
      isHalfPrice: boolean
      isFree: boolean
      couponId: number | null
      associateId: string | null
      /** Desconto unitário (R$) já validado */
      discountPerUnit: number
      totalSlots: number
    }

    const eventProcessing = new Map<number, EventProcessing>()

    for (const item of data.items) {
      const event = eventMap.get(item.event_id)!
      const totalSlots = slots.byEvent.get(item.event_id) ?? 0

      if (totalSlots === 0) {
        // Evento no carrinho mas sem participante atribuído — bloquear no modo multiple.
        return NextResponse.json(
          { error: `"${event.title}" não tem nenhum participante atribuído` },
          { status: 400 }
        )
      }

      // Capacity check
      if (event.capacity > 0) {
        const { count } = await supabase
          .from('inscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', item.event_id)
          .in('payment_status', ['confirmed', 'free', 'pending'])

        const available = event.capacity - (count ?? 0)
        if (available < totalSlots) {
          return NextResponse.json(
            { error: `"${event.title}": ${available <= 0 ? 'esgotado' : `apenas ${available} vaga(s) disponível(is)`}` },
            { status: 400 }
          )
        }
      }

      // Half-price validation
      if (item.is_half_price) {
        if (event.half_price <= 0) {
          return NextResponse.json(
            { error: `"${event.title}" não possui meia-entrada` },
            { status: 400 }
          )
        }

        const { count: halfPriceUsed } = await supabase
          .from('inscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', item.event_id)
          .eq('is_half_price', true)
          .in('payment_status', ['confirmed', 'free', 'pending'])

        const halfAvailable = event.half_price - (halfPriceUsed ?? 0)
        if (halfAvailable < totalSlots) {
          return NextResponse.json(
            { error: `"${event.title}": ${halfAvailable <= 0 ? 'meia-entrada esgotada' : `apenas ${halfAvailable} vaga(s) meia-entrada`}` },
            { status: 400 }
          )
        }
      }

      const isFree = event.price === 0
      const unitPrice = item.is_half_price ? event.price / 2 : event.price

      let couponId: number | null = null
      let associateId: string | null = null
      let discountPerUnit = 0

      if (item.coupon_code && !isFree) {
        const validation = await validateCouponWithAssociate(supabase, {
          code: item.coupon_code,
          eventId: item.event_id,
          cnpj: cnpjDigits,
        })

        if (!validation.ok) {
          return NextResponse.json(
            {
              error: `Cupom "${item.coupon_code.toUpperCase()}" para "${event.title}": ${validation.message}`,
              error_code: validation.code,
              event_id: item.event_id,
            },
            { status: 400 }
          )
        }

        const totalBefore = unitPrice * totalSlots
        const totalAfter = applyCouponDiscount(totalBefore, validation.coupon, totalSlots)
        discountPerUnit = totalSlots > 0 ? (totalBefore - totalAfter) / totalSlots : 0
        couponId = validation.coupon.id
        associateId = validation.associate_id

        // Incrementa current_uses (1× por evento por checkout)
        const { data: c } = await supabase
          .from('coupons')
          .select('current_uses')
          .eq('id', couponId)
          .single()
        if (c) {
          await supabase
            .from('coupons')
            .update({ current_uses: (c.current_uses ?? 0) + 1 })
            .eq('id', couponId)
        }
      }

      eventProcessing.set(item.event_id, {
        event_id: item.event_id,
        unitPrice,
        isHalfPrice: item.is_half_price,
        isFree,
        couponId,
        associateId,
        discountPerUnit,
        totalSlots,
      })
    }

    // Calcular total a pagar (somando todos os slots de todos os participantes)
    let paidTotal = 0
    let hasPaid = false
    let hasFree = false
    for (const proc of Array.from(eventProcessing.values())) {
      if (proc.isFree) {
        hasFree = true
      } else {
        hasPaid = true
        const linePrice = (proc.unitPrice - proc.discountPerUnit) * proc.totalSlots
        paidTotal += Math.max(0, linePrice)
      }
    }

    // Cliente Asaas usa o titular (primeiro participante)
    const titular = data.participants[0]
    const titularCpfClean = titular.cpf.replace(/\D/g, '')

    let paymentUrl: string | null = null
    let paymentId: string | null = null
    let asaasCustomerId: string | null = null
    let pixData: { qrCodeImage: string; payload: string; expiresAt: string | null } | null = null
    let boletoData: {
      bankSlipUrl: string
      identificationField: string | null
      dueDate: string
    } | null = null

    // Para CREDIT_CARD não criamos payment Asaas aqui — o pagamento será processado pelo
     // endpoint dedicado /api/payments/credit-card que cobra de forma síncrona com os dados
     // do cartão. O checkout só registra as inscriptions como pending.
    const skipAsaasNow = data.payment_method === 'CREDIT_CARD'

    if (hasPaid && paidTotal > 0 && !skipAsaasNow) {
      const customer = await createCustomer({
        name: titular.nome,
        email: titular.email,
        cpfCnpj: titularCpfClean,
        phone: titular.telefone?.replace(/\D/g, ''),
        postalCode: titular.cep?.replace(/\D/g, ''),
        address: titular.rua,
        addressNumber: titular.numero,
        complement: titular.complemento || undefined,
        province: titular.bairro,
        city: titular.cidade,
        state: titular.estado,
      })
      asaasCustomerId = customer.id

      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 3)
      const dueDateStr = dueDate.toISOString().split('T')[0]

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const isLocalhost =
        siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1') || siteUrl.includes('ngrok')

      const eventTitles = Array.from(eventProcessing.values())
        .filter((p) => !p.isFree)
        .map((p) => eventMap.get(p.event_id)!.title)
        .join(', ')

      const billingType = data.payment_method ?? 'UNDEFINED'

      const payment = await createPayment({
        customer: customer.id,
        billingType,
        value: paidTotal,
        dueDate: dueDateStr,
        description: `Carrinho ${purchaseGroup} - ${eventTitles}`.slice(0, 200),
        externalReference: purchaseGroup,
        ...(!isLocalhost && {
          callback: {
            successUrl: `${siteUrl}/pagamento/retorno?group=${purchaseGroup}`,
            autoRedirect: true,
          },
        }),
      })

      paymentUrl = payment.invoiceUrl
      paymentId = payment.id

      if (billingType === 'PIX') {
        try {
          const pix = await getPaymentPixQrCode(payment.id)
          pixData = {
            qrCodeImage: pix.encodedImage
              ? `data:image/png;base64,${pix.encodedImage}`
              : '',
            payload: pix.payload || '',
            expiresAt: pix.expirationDate || null,
          }
        } catch (e) {
          console.error('[CHECKOUT] Erro ao buscar PIX QR code:', e)
        }
      }

      if (billingType === 'BOLETO') {
        boletoData = {
          bankSlipUrl: payment.bankSlipUrl || payment.invoiceUrl,
          identificationField: payment.identificationField || null,
          dueDate: dueDateStr,
        }
      }
    }

    // Para cada participante: gerar QR, criar inscriptions (1 por slot) e tickets
    for (const slot of slots.bySlot) {
      const participantQR = await generateAndUploadQRCode(
        purchaseGroup,
        'participant',
        slot.cpfClean
      )

      for (const [eventId, slotCount] of Array.from(slot.eventSlots.entries())) {
        const proc = eventProcessing.get(eventId)!
        const item = itemMap.get(eventId)!

        for (let s = 0; s < slotCount; s++) {
          const orderNumber = generateOrderNumber()
          const lineTotal = proc.isFree
            ? 0
            : Math.max(0, proc.unitPrice - proc.discountPerUnit)

          const { data: inscription } = await supabase
            .from('inscriptions')
            .insert({
              nome: slot.participant.nome,
              email: slot.participant.email,
              cpf: slot.cpfClean,
              telefone: slot.participant.telefone.replace(/\D/g, ''),
              cnpj: cnpjDigits,
              nome_empresa: slot.participant.nome_empresa || null,
              cargo: slot.participant.cargo || null,
              cep: slot.participant.cep || null,
              rua: slot.participant.rua || null,
              numero: slot.participant.numero || null,
              bairro: slot.participant.bairro || null,
              cidade: slot.participant.cidade || null,
              estado: slot.participant.estado || null,
              complemento: slot.participant.complemento || null,
              accepted_terms: slot.participant.accepted_terms,
              event_id: eventId,
              order_number: orderNumber,
              quantity: 1,
              is_half_price: proc.isHalfPrice,
              total_amount: lineTotal,
              net_amount: lineTotal,
              payment_status: proc.isFree ? 'free' : 'pending',
              payment_id: proc.isFree ? null : paymentId,
              payment_url: proc.isFree ? null : paymentUrl,
              asaas_customer_id: proc.isFree ? null : asaasCustomerId,
              qr_code: participantQR,
              purchase_group: purchaseGroup,
              coupon_id: proc.couponId,
              associate_id: proc.associateId,
            })
            .select()
            .single()

          // Tickets só são criados para itens gratuitos aqui; para pagos, são criados pelo
          // webhook do Asaas após a confirmação do pagamento.
          if (inscription && proc.isFree) {
            await supabase.from('tickets').insert({
              inscription_id: inscription.id,
              event_id: eventId,
              participant_name: slot.participant.nome,
              status: 'active',
            })

            fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email/confirmation`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ order_number: orderNumber }),
            }).catch((e) => console.error('Erro ao enviar email:', e))
          }
        }
      }
    }

    // Atualiza dados pessoais (snapshot mais recente) das inscrições anteriores do titular
    await supabase
      .from('inscriptions')
      .update({
        nome: titular.nome,
        email: titular.email,
        telefone: titular.telefone.replace(/\D/g, ''),
        cnpj: cnpjDigits,
        nome_empresa: titular.nome_empresa || null,
        cargo: titular.cargo || null,
        cep: titular.cep || null,
        rua: titular.rua || null,
        numero: titular.numero || null,
        bairro: titular.bairro || null,
        cidade: titular.cidade || null,
        estado: titular.estado || null,
        complemento: titular.complemento || null,
      })
      .eq('cpf', titularCpfClean)
      .neq('purchase_group', purchaseGroup)

    return NextResponse.json({
      success: true,
      purchase_group: purchaseGroup,
      payment_url: paymentUrl,
      payment_id: paymentId,
      payment_method: data.payment_method ?? null,
      has_paid: hasPaid,
      has_free: hasFree,
      total_amount: paidTotal,
      pix: pixData,
      boleto: boletoData,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    reportError(error, { scope: 'cart.checkout' })
    return NextResponse.json(
      { error: `Erro ao processar checkout: ${message}` },
      { status: 500 }
    )
  }
}

/**
 * Constrói a alocação participante × evento.
 * - Modo `single`: o único participante recebe todos os slots de cada item (quantity).
 * - Modo `multiple`: usa `event_ids` de cada participante (1 entrada = 1 slot daquele evento)
 *   e valida que a soma por evento bate com `quantity` do item.
 */
function buildParticipantSlots(
  mode: 'single' | 'multiple',
  participants: ParticipantPayload[],
  items: CartItemPayload[]
): { bySlot: ParticipantSlot[]; byEvent: Map<number, number> } | { error: string } {
  // CPF distinto entre participantes
  const seenCpfs = new Set<string>()
  for (const p of participants) {
    const c = p.cpf.replace(/\D/g, '')
    if (seenCpfs.has(c)) {
      return { error: `CPF ${p.cpf} aparece em mais de um participante` }
    }
    seenCpfs.add(c)
  }

  if (mode === 'single') {
    if (participants.length !== 1) {
      return { error: 'Modo single deve ter exatamente 1 participante' }
    }
    const p = participants[0]
    const eventSlots = new Map<number, number>()
    const byEvent = new Map<number, number>()
    for (const item of items) {
      eventSlots.set(item.event_id, item.quantity)
      byEvent.set(item.event_id, item.quantity)
    }
    return {
      bySlot: [
        {
          participant: p,
          cpfClean: p.cpf.replace(/\D/g, ''),
          eventSlots,
        },
      ],
      byEvent,
    }
  }

  // mode === 'multiple'
  const totalSlots = items.reduce((s, i) => s + i.quantity, 0)
  if (participants.length > totalSlots) {
    return {
      error: `Há ${participants.length} participante(s) mas apenas ${totalSlots} ingresso(s) na programação`,
    }
  }

  const byEvent = new Map<number, number>()
  const bySlot: ParticipantSlot[] = []

  for (const p of participants) {
    if (!p.event_ids || p.event_ids.length === 0) {
      return { error: `Participante ${p.nome} não foi vinculado a nenhum evento` }
    }
    const eventSlots = new Map<number, number>()
    for (const eid of p.event_ids) {
      eventSlots.set(eid, (eventSlots.get(eid) ?? 0) + 1)
      byEvent.set(eid, (byEvent.get(eid) ?? 0) + 1)
    }
    bySlot.push({
      participant: p,
      cpfClean: p.cpf.replace(/\D/g, ''),
      eventSlots,
    })
  }

  // Cada evento precisa ter exatamente quantity participantes alocados
  for (const item of items) {
    const allocated = byEvent.get(item.event_id) ?? 0
    if (allocated !== item.quantity) {
      return {
        error: `Evento ${item.event_id}: ${allocated} participante(s) atribuído(s), mas o carrinho tem ${item.quantity} ingresso(s)`,
      }
    }
  }

  // Eventos não previstos no carrinho
  const cartEventIds = new Set(items.map((i) => i.event_id))
  for (const eid of Array.from(byEvent.keys())) {
    if (!cartEventIds.has(eid)) {
      return { error: `Evento ${eid} foi atribuído mas não está no carrinho` }
    }
  }

  return { bySlot, byEvent }
}
