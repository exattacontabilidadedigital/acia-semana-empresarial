import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPaymentStatus, createPayment } from '@/lib/asaas'

export async function POST(request: Request) {
  try {
    const { order_number, cpf } = await request.json()

    if (!order_number || !cpf) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const cpfClean = cpf.replace(/\D/g, '')
    const supabase = createAdminClient()

    // Busca inscrição pendente que bate order_number + CPF
    const { data: inscription, error } = await supabase
      .from('inscriptions')
      .select('*')
      .eq('order_number', order_number)
      .eq('cpf', cpfClean)
      .eq('payment_status', 'pending')
      .single()

    if (error || !inscription) {
      return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 })
    }

    if (!inscription.payment_id) {
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
    }

    // Consulta status no Asaas
    const asaasPayment = await getPaymentStatus(inscription.payment_id)

    // Se pagamento ainda ativo, retorna URL existente
    if (asaasPayment.status === 'PENDING' || asaasPayment.status === 'ACTIVE') {
      return NextResponse.json({
        payment_url: inscription.payment_url,
      })
    }

    // Se expirado/cancelado, cria novo pagamento
    if (['OVERDUE', 'CANCELLED', 'REFUNDED'].includes(asaasPayment.status)) {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 3)

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const isLocalhost = siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1')

      // Busca evento para descrição
      const { data: event } = await supabase
        .from('events')
        .select('title')
        .eq('id', inscription.event_id)
        .single()

      const newPayment = await createPayment({
        customer: inscription.asaas_customer_id!,
        billingType: 'UNDEFINED',
        value: inscription.total_amount,
        dueDate: dueDate.toISOString().split('T')[0],
        description: `Inscrição ${inscription.order_number} - ${event?.title || 'Evento'}`,
        externalReference: inscription.order_number!,
        ...(!isLocalhost && {
          callback: {
            successUrl: `${siteUrl}/pagamento/retorno?order=${inscription.order_number}`,
            autoRedirect: true,
          },
        }),
      })

      // Atualiza inscrição com novo payment
      await supabase
        .from('inscriptions')
        .update({
          payment_id: newPayment.id,
          payment_url: newPayment.invoiceUrl,
        })
        .eq('id', inscription.id)

      return NextResponse.json({
        payment_url: newPayment.invoiceUrl,
      })
    }

    // Status inesperado (CONFIRMED, RECEIVED, etc.)
    return NextResponse.json({
      error: 'Este pagamento não pode ser retomado. Status atual: ' + asaasPayment.status,
    }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Erro ao retomar pagamento:', message, error)
    return NextResponse.json({ error: `Erro ao retomar pagamento: ${message}` }, { status: 500 })
  }
}
