import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCustomer, createPayment } from '@/lib/asaas'
import { generateOrderNumber } from '@/lib/utils'
import { validateCouponWithAssociate, applyCouponDiscount } from '@/lib/coupons'

const createPaymentSchema = z.object({
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
  coupon_code: z.string().optional(),
  accepted_terms: z.literal(true),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = createPaymentSchema.parse(body)

    const supabase = createAdminClient()

    // Fetch event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', data.event_id)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
    }

    // Validar meia-entrada
    if (data.is_half_price) {
      if (event.half_price <= 0) {
        return NextResponse.json({ error: 'Este evento não possui meia-entrada' }, { status: 400 })
      }

      // Contar meia-entradas já usadas
      const { count: halfPriceUsed } = await supabase
        .from('inscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', data.event_id)
        .eq('is_half_price', true)
        .in('payment_status', ['confirmed', 'free', 'pending'])

      const halfPriceAvailable = event.half_price - (halfPriceUsed ?? 0)
      if (halfPriceAvailable < data.quantity) {
        return NextResponse.json(
          { error: halfPriceAvailable <= 0 ? 'Meia-entrada esgotada' : `Apenas ${halfPriceAvailable} vaga(s) meia-entrada disponível(is)` },
          { status: 400 }
        )
      }
    }

    const unitPrice = data.is_half_price ? event.price / 2 : event.price
    let totalAmount = unitPrice * data.quantity
    let couponId: number | null = null
    let associateId: string | null = null
    const cnpjDigits = (data.cnpj ?? '').replace(/\D/g, '') || null

    // Validate coupon if provided (usa helper central — suporta escopo de associado)
    if (data.coupon_code) {
      const validation = await validateCouponWithAssociate(supabase, {
        code: data.coupon_code,
        eventId: data.event_id,
        cnpj: cnpjDigits,
      })

      if (!validation.ok) {
        return NextResponse.json(
          { error: validation.message, error_code: validation.code },
          { status: 400 }
        )
      }

      totalAmount = applyCouponDiscount(totalAmount, validation.coupon, data.quantity)
      couponId = validation.coupon.id
      associateId = validation.associate_id

      // Increment coupon usage (read-modify-write — OK p/ baixo volume)
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

    const orderNumber = generateOrderNumber()
    const cpfClean = data.cpf.replace(/\D/g, '')

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

    // Create Asaas payment
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 3)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const isLocalhost = siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1') || siteUrl.includes('ngrok')

    const payment = await createPayment({
      customer: customer.id,
      billingType: 'UNDEFINED',
      value: totalAmount,
      dueDate: dueDate.toISOString().split('T')[0],
      description: `Inscrição ${orderNumber} - ${event.title}`,
      externalReference: orderNumber,
      ...(!isLocalhost && {
        callback: {
          successUrl: `${siteUrl}/pagamento/retorno?order=${orderNumber}`,
          autoRedirect: true,
        },
      }),
    })

    // Create inscription
    const { error: inscriptionError } = await supabase
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
        total_amount: totalAmount,
        net_amount: totalAmount,
        payment_id: payment.id,
        payment_url: payment.invoiceUrl,
        payment_status: 'pending',
        asaas_customer_id: customer.id,
        coupon_id: couponId,
        associate_id: associateId,
        accepted_terms: data.accepted_terms,
      })

    if (inscriptionError) {
      console.error('Erro ao criar inscrição:', inscriptionError)
      return NextResponse.json({ error: 'Erro ao criar inscrição' }, { status: 500 })
    }

    // Atualiza dados pessoais nas inscrições anteriores do mesmo CPF
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
      .neq('order_number', orderNumber)

    return NextResponse.json({
      success: true,
      payment_url: payment.invoiceUrl,
      order_number: orderNumber,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Erro ao processar pagamento:', message, error)
    return NextResponse.json(
      { error: `Erro ao processar pagamento: ${message}` },
      { status: 500 }
    )
  }
}
