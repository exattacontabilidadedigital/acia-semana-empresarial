import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCustomer, createPayment, getPaymentPixQrCode } from '@/lib/asaas'

const schema = z.object({
  purchase_group: z.string().min(1),
})

/**
 * Gera um novo PIX para um purchase_group cujo PIX original expirou. Mantém as inscriptions
 * pending intactas, apenas atualiza o `payment_id`/`payment_url` para o novo cobrança no Asaas.
 *
 * Requisitos: o grupo precisa ter ao menos uma inscription `pending` paga (não free).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { purchase_group } = schema.parse(body)

    const supabase = createAdminClient()

    const { data: inscriptions } = await supabase
      .from('inscriptions')
      .select('*')
      .eq('purchase_group', purchase_group)
      .order('created_at', { ascending: true })

    if (!inscriptions || inscriptions.length === 0) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }

    const pendingPaid = inscriptions.filter(
      (i) => i.payment_status === 'pending' && Number(i.total_amount) > 0,
    )

    if (pendingPaid.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma inscrição pendente para regerar' },
        { status: 400 },
      )
    }

    const titular = pendingPaid[0]
    const totalAmount = pendingPaid.reduce((s, i) => s + Number(i.total_amount || 0), 0)

    const customer = await createCustomer({
      name: titular.nome,
      email: titular.email,
      cpfCnpj: titular.cpf,
      phone: titular.telefone || undefined,
      postalCode: titular.cep || undefined,
      address: titular.rua || undefined,
      addressNumber: titular.numero || undefined,
      complement: titular.complemento || undefined,
      province: titular.bairro || undefined,
      city: titular.cidade || undefined,
      state: titular.estado || undefined,
    })

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 3)
    const dueDateStr = dueDate.toISOString().split('T')[0]

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const isLocalhost =
      siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1') || siteUrl.includes('ngrok')

    const payment = await createPayment({
      customer: customer.id,
      billingType: 'PIX',
      value: totalAmount,
      dueDate: dueDateStr,
      description: `Carrinho ${purchase_group} (PIX regerado)`.slice(0, 200),
      externalReference: purchase_group,
      ...(!isLocalhost && {
        callback: {
          successUrl: `${siteUrl}/pagamento/retorno?group=${purchase_group}`,
          autoRedirect: true,
        },
      }),
    })

    let pixData: { qrCodeImage: string; payload: string; expiresAt: string | null } = {
      qrCodeImage: '',
      payload: '',
      expiresAt: null,
    }
    try {
      const pix = await getPaymentPixQrCode(payment.id)
      pixData = {
        qrCodeImage: pix.encodedImage ? `data:image/png;base64,${pix.encodedImage}` : '',
        payload: pix.payload || '',
        expiresAt: pix.expirationDate || null,
      }
    } catch (e) {
      console.error('[PIX_REGEN] Erro ao buscar QR:', e)
    }

    // Atualiza payment_id/payment_url das inscriptions pendentes pra apontar pro novo payment
    await supabase
      .from('inscriptions')
      .update({
        payment_id: payment.id,
        payment_url: payment.invoiceUrl ?? null,
        asaas_customer_id: customer.id,
      })
      .eq('purchase_group', purchase_group)
      .eq('payment_status', 'pending')

    return NextResponse.json({
      success: true,
      purchase_group,
      payment_id: payment.id,
      total_amount: totalAmount,
      pix: pixData,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 },
      )
    }
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[PIX_REGEN] Erro:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
