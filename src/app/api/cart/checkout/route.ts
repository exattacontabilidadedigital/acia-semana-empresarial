import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCustomer, createPayment } from '@/lib/asaas'
import { generateOrderNumber, generatePurchaseGroup } from '@/lib/utils'
import { generateAndUploadQRCode } from '@/lib/qrcode'
import { validateCouponWithAssociate, applyCouponDiscount } from '@/lib/coupons'

const cartItemSchema = z.object({
  event_id: z.number().int(),
  quantity: z.number().int().min(1),
  is_half_price: z.boolean().optional().default(false),
  coupon_code: z.string().optional(),
})

const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1),
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
  accepted_terms: z.literal(true),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = checkoutSchema.parse(body)

    const supabase = createAdminClient()
    const purchaseGroup = generatePurchaseGroup()
    const cpfClean = data.cpf.replace(/\D/g, '')

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

    // Validate each item: spots, half-price, coupons
    interface ProcessedItem {
      event_id: number
      quantity: number
      is_half_price: boolean
      unitPrice: number
      totalAmount: number
      couponId: number | null
      associateId: string | null
      isFree: boolean
    }

    const processed: ProcessedItem[] = []
    const cnpjDigits = (data.cnpj ?? '').replace(/\D/g, '') || null

    for (const item of data.items) {
      const event = eventMap.get(item.event_id)!

      // Check capacity
      if (event.capacity > 0) {
        const { count } = await supabase
          .from('inscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', item.event_id)
          .in('payment_status', ['confirmed', 'free', 'pending'])

        const available = event.capacity - (count ?? 0)
        if (available < item.quantity) {
          return NextResponse.json(
            { error: `"${event.title}": ${available <= 0 ? 'esgotado' : `apenas ${available} vaga(s) disponível(is)`}` },
            { status: 400 }
          )
        }
      }

      // Validate half-price
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
        if (halfAvailable < item.quantity) {
          return NextResponse.json(
            { error: `"${event.title}": ${halfAvailable <= 0 ? 'meia-entrada esgotada' : `apenas ${halfAvailable} vaga(s) meia-entrada`}` },
            { status: 400 }
          )
        }
      }

      const isFree = event.price === 0
      const unitPrice = item.is_half_price ? event.price / 2 : event.price
      let totalAmount = unitPrice * item.quantity
      let couponId: number | null = null
      let associateId: string | null = null

      // Validate coupon (incluindo lógica de associado)
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

        totalAmount = applyCouponDiscount(
          totalAmount,
          validation.coupon,
          item.quantity
        )
        couponId = validation.coupon.id
        associateId = validation.associate_id

        // Incrementa current_uses (read-modify-write — adequado p/ baixo volume)
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

      processed.push({
        event_id: item.event_id,
        quantity: item.quantity,
        is_half_price: item.is_half_price,
        unitPrice,
        totalAmount: isFree ? 0 : totalAmount,
        couponId,
        associateId,
        isFree,
      })
    }

    const freeItems = processed.filter((i) => i.isFree)
    const paidItems = processed.filter((i) => !i.isFree)
    const paidTotal = paidItems.reduce((sum, i) => sum + i.totalAmount, 0)

    const personalData = {
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
      accepted_terms: data.accepted_terms,
    }

    // Gerar 1 QR code para o grupo inteiro
    const groupQrCodeUrl = await generateAndUploadQRCode(purchaseGroup, 'group')

    // Process free items immediately
    for (const item of freeItems) {
      const orderNumber = generateOrderNumber()

      const { data: inscription } = await supabase
        .from('inscriptions')
        .insert({
          ...personalData,
          event_id: item.event_id,
          order_number: orderNumber,
          quantity: item.quantity,
          is_half_price: item.is_half_price,
          total_amount: 0,
          net_amount: 0,
          payment_status: 'free',
          qr_code: groupQrCodeUrl,
          purchase_group: purchaseGroup,
          coupon_id: item.couponId,
          associate_id: item.associateId,
        })
        .select()
        .single()

      if (inscription) {
        const tickets = []
        for (let i = 0; i < item.quantity; i++) {
          tickets.push({
            inscription_id: inscription.id,
            event_id: item.event_id,
            participant_name: data.nome,
            status: 'active',
          })
        }
        await supabase.from('tickets').insert(tickets)

        // Send email async
        fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email/confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_number: orderNumber }),
        }).catch((e) => console.error('Erro ao enviar email:', e))
      }
    }

    // Process paid items
    let paymentUrl: string | null = null

    if (paidItems.length > 0 && paidTotal > 0) {
      // Create Asaas customer
      const customer = await createCustomer({
        name: data.nome,
        email: data.email,
        cpfCnpj: cpfClean,
        phone: data.telefone?.replace(/\D/g, ''),
        postalCode: data.cep?.replace(/\D/g, ''),
        address: data.rua,
        addressNumber: data.numero,
        complement: data.complemento || undefined,
        province: data.bairro,
        city: data.cidade,
        state: data.estado,
      })

      // Create single payment for all paid items
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 3)

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const isLocalhost = siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1') || siteUrl.includes('ngrok')

      const eventTitles = paidItems
        .map((i) => eventMap.get(i.event_id)!.title)
        .join(', ')

      const payment = await createPayment({
        customer: customer.id,
        billingType: 'UNDEFINED',
        value: paidTotal,
        dueDate: dueDate.toISOString().split('T')[0],
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

      // Create pending inscriptions for each paid item
      for (const item of paidItems) {
        const orderNumber = generateOrderNumber()

        await supabase.from('inscriptions').insert({
          ...personalData,
          event_id: item.event_id,
          order_number: orderNumber,
          quantity: item.quantity,
          is_half_price: item.is_half_price,
          total_amount: item.totalAmount,
          net_amount: item.totalAmount,
          payment_status: 'pending',
          payment_id: payment.id,
          payment_url: payment.invoiceUrl,
          asaas_customer_id: customer.id,
          purchase_group: purchaseGroup,
          coupon_id: item.couponId,
          associate_id: item.associateId,
        })
      }
    }

    // Update personal data on previous inscriptions
    await supabase
      .from('inscriptions')
      .update({
        nome: data.nome,
        email: data.email,
        telefone: data.telefone.replace(/\D/g, ''),
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
      .neq('purchase_group', purchaseGroup)

    return NextResponse.json({
      success: true,
      purchase_group: purchaseGroup,
      payment_url: paymentUrl,
      has_paid: paidItems.length > 0,
      has_free: freeItems.length > 0,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Erro no checkout do carrinho:', message, error)
    return NextResponse.json(
      { error: `Erro ao processar checkout: ${message}` },
      { status: 500 }
    )
  }
}
