import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCustomer, createPayment, AsaasError } from '@/lib/asaas'
import { confirmInscriptionAtomic } from '@/lib/inscriptions'
import { enforceRateLimit } from '@/lib/rate-limit'
import { reportError } from '@/lib/observability'

const creditCardSchema = z.object({
  purchase_group: z.string().min(1),
  installmentCount: z.number().int().min(1).max(12).optional().default(1),
  // Pagamento com cartão novo OU com cartão tokenizado salvo
  card: z
    .object({
      holderName: z.string().min(2),
      number: z.string().min(13).max(19),
      expiryMonth: z.string().regex(/^\d{2}$/),
      expiryYear: z.string().regex(/^\d{2,4}$/),
      ccv: z.string().regex(/^\d{3,4}$/),
    })
    .optional(),
  saved_card_id: z.number().int().optional(),
  /** Quando true e veio cartão novo, persiste o token retornado pra usar em compras futuras. */
  save_card: z.boolean().optional(),
})

export async function POST(request: Request) {
  try {
    // Limite agressivo: 5 tentativas por minuto por IP. Contém brute-force de cartões
    // roubados (testar dezenas de números) e protege a conta Asaas de bloqueio por
    // muitas recusas seguidas.
    const limited = enforceRateLimit(request, {
      key: 'credit-card-attempt',
      limit: 5,
      windowSeconds: 60,
    })
    if (limited) return limited

    const body = await request.json()
    const data = creditCardSchema.parse(body)

    const supabase = createAdminClient()

    // Carrega as inscriptions desse purchase_group (precisamos do titular e do total)
    const { data: inscriptions } = await supabase
      .from('inscriptions')
      .select('*')
      .eq('purchase_group', data.purchase_group)
      .order('created_at', { ascending: true })

    if (!inscriptions || inscriptions.length === 0) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }

    // Já confirmadas? bloqueia
    const allConfirmed = inscriptions.every(
      (i) => i.payment_status === 'confirmed' || i.payment_status === 'free',
    )
    if (allConfirmed) {
      return NextResponse.json(
        { success: true, already_paid: true, purchase_group: data.purchase_group },
      )
    }

    // Pega só as pendentes pagas
    const pendingPaid = inscriptions.filter(
      (i) => i.payment_status === 'pending' && Number(i.total_amount) > 0,
    )

    if (pendingPaid.length === 0) {
      return NextResponse.json({ error: 'Nenhuma inscrição pendente para pagamento' }, { status: 400 })
    }

    const titular = pendingPaid[0]
    const totalAmount = pendingPaid.reduce((s, i) => s + Number(i.total_amount || 0), 0)

    // Cria/recupera cliente Asaas
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

    const remoteIp =
      request.headers.get('x-real-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      undefined

    const installmentCount = data.installmentCount > 1 ? data.installmentCount : undefined

    // Resolve fonte do cartão: novo (com dados) ou tokenizado salvo
    let savedCard:
      | { id: number; asaas_token: string; asaas_customer_id: string }
      | null = null
    if (data.saved_card_id) {
      const { data: sc } = await supabase
        .from('saved_cards')
        .select('id, asaas_token, asaas_customer_id, cpf')
        .eq('id', data.saved_card_id)
        .eq('cpf', titular.cpf)
        .single()
      if (!sc) {
        return NextResponse.json(
          { success: false, error: 'Cartão salvo não encontrado para este CPF.' },
          { status: 404 },
        )
      }
      savedCard = { id: sc.id, asaas_token: sc.asaas_token, asaas_customer_id: sc.asaas_customer_id }
    }

    if (!savedCard && !data.card) {
      return NextResponse.json(
        { success: false, error: 'Informe os dados do cartão ou selecione um cartão salvo.' },
        { status: 400 },
      )
    }

    const expYear = data.card
      ? data.card.expiryYear.length === 2
        ? `20${data.card.expiryYear}`
        : data.card.expiryYear
      : ''
    const cardNumber = data.card ? data.card.number.replace(/\s/g, '') : ''

    let payment: Awaited<ReturnType<typeof createPayment>>
    try {
      payment = await createPayment({
        customer: savedCard?.asaas_customer_id ?? customer.id,
        billingType: 'CREDIT_CARD',
        value: installmentCount
          ? Math.round((totalAmount / installmentCount) * 100) / 100
          : totalAmount,
        dueDate: dueDateStr,
        description: `Carrinho ${data.purchase_group}`,
        externalReference: data.purchase_group,
        ...(installmentCount ? { installmentCount, totalValue: totalAmount } : {}),
        ...(savedCard
          ? { creditCardToken: savedCard.asaas_token }
          : {
              creditCard: {
                holderName: data.card!.holderName,
                number: cardNumber,
                expiryMonth: data.card!.expiryMonth,
                expiryYear: expYear,
                ccv: data.card!.ccv,
              },
              creditCardHolderInfo: {
                name: titular.nome,
                email: titular.email,
                cpfCnpj: titular.cpf,
                postalCode: titular.cep || '00000000',
                addressNumber: titular.numero || 'S/N',
                addressComplement: titular.complemento || undefined,
                phone: titular.telefone || undefined,
                mobilePhone: titular.telefone || undefined,
              },
            }),
        remoteIp,
      })
    } catch (err) {
      if (err instanceof AsaasError) {
        const friendly = mapCreditCardError(err)
        // Não logar dados de cartão; só código + mensagem do gateway
        console.error('[CREDIT_CARD] Pagamento recusado pelo Asaas:', err.code, err.description)
        return NextResponse.json(
          {
            success: false,
            error: friendly,
            asaas_code: err.code,
            asaas_description: err.description,
          },
          { status: 400 },
        )
      }
      throw err
    }

    const confirmedStatuses = ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH', 'AUTHORIZED']
    const success = confirmedStatuses.includes(payment.status)

    if (!success) {
      console.error('[CREDIT_CARD] Status inesperado:', payment.status)
      return NextResponse.json(
        {
          success: false,
          error: 'Pagamento não aprovado pela operadora. Verifique os dados e tente novamente.',
          asaas_status: payment.status,
        },
        { status: 400 },
      )
    }

    // Persistência do token (se cartão novo + save_card=true OU se já era salvo: atualiza last_used_at)
    try {
      if (savedCard) {
        await supabase
          .from('saved_cards')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', savedCard.id)
      } else if (data.save_card && payment.creditCard?.creditCardToken) {
        await supabase
          .from('saved_cards')
          .upsert(
            {
              cpf: titular.cpf,
              asaas_customer_id: customer.id,
              asaas_token: payment.creditCard.creditCardToken,
              brand: payment.creditCard.creditCardBrand ?? null,
              last4: cardNumber.slice(-4),
              holder_name: data.card!.holderName,
              expiry_month: data.card!.expiryMonth,
              expiry_year: expYear,
              last_used_at: new Date().toISOString(),
            },
            { onConflict: 'cpf,asaas_token' },
          )
      }
    } catch (e) {
      // Falhar em salvar cartão não deve invalidar o pagamento aprovado
      console.error('[CREDIT_CARD] Erro ao salvar cartão tokenizado:', e)
    }

    // Atualiza inscriptions como confirmadas + cria tickets de forma atômica
    for (const inscription of pendingPaid) {
      await confirmInscriptionAtomic(supabase, inscription, {
        payment_id: payment.id,
        payment_url: payment.invoiceUrl ?? null,
        asaas_customer_id: customer.id,
      })
    }

    return NextResponse.json({
      success: true,
      purchase_group: data.purchase_group,
      asaas_status: payment.status,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: error.errors },
        { status: 400 },
      )
    }
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    reportError(error, { scope: 'payments.credit-card' })
    return NextResponse.json(
      { success: false, error: `Erro ao processar pagamento: ${message}` },
      { status: 500 },
    )
  }
}

// Mapeia códigos/descrições do Asaas para mensagens amigáveis em pt-BR.
// Quando não bate em nenhum caso conhecido, devolve a description original do gateway
// (que costuma ser informativa: "Saldo insuficiente", "Cartão recusado pelo emissor", etc.).
function mapCreditCardError(err: AsaasError): string {
  const code = (err.code ?? '').toLowerCase()
  const desc = (err.description ?? '').toLowerCase()

  if (code.includes('insufficient_funds') || desc.includes('saldo insuficiente')) {
    return 'Saldo insuficiente no cartão. Tente outro cartão ou reduza o valor.'
  }
  if (code.includes('expired_card') || desc.includes('vencid') || desc.includes('expired')) {
    return 'Cartão vencido. Use um cartão com validade futura.'
  }
  if (
    code.includes('invalid_creditcard') ||
    code.includes('invalid_card') ||
    desc.includes('inválido') ||
    desc.includes('invalido')
  ) {
    return 'Dados do cartão inválidos. Confira número, validade e CVV.'
  }
  if (
    code.includes('do_not_honor') ||
    code.includes('declined') ||
    desc.includes('recusad') ||
    desc.includes('declined')
  ) {
    return 'Cartão recusado pelo emissor. Entre em contato com seu banco ou tente outro cartão.'
  }
  if (code.includes('transaction_not_permitted') || desc.includes('não permit') || desc.includes('nao permit')) {
    return 'Transação não permitida para este cartão. Tente outro cartão.'
  }
  if (code.includes('blocked') || desc.includes('bloquead')) {
    return 'Cartão bloqueado. Entre em contato com seu banco ou tente outro cartão.'
  }
  if (code.includes('cvv') || desc.includes('cvv') || desc.includes('código de segurança')) {
    return 'CVV inválido. Confira o código de segurança no verso do cartão.'
  }
  if (code.includes('limit') || desc.includes('limite')) {
    return 'Limite do cartão atingido ou excedido. Tente outro cartão.'
  }

  // Fallback: usa a descrição do gateway (já em pt-BR na maioria dos casos do Asaas BR)
  return err.description || 'Pagamento recusado. Verifique os dados e tente novamente.'
}
