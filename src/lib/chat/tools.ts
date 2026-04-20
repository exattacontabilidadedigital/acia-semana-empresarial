import { createAdminClient } from '@/lib/supabase/admin'
import { createPayment, getPaymentStatus } from '@/lib/asaas'
import type { ZaiToolDefinition } from '@/lib/zai'
import {
  EDITION_CONFIG,
  todayInBrazil,
  formatDateBR,
  formatDateTimeBR,
} from '@/lib/edition-config'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') || 'http://localhost:3000'

function cleanCpf(cpf: string): string {
  return (cpf || '').replace(/\D/g, '')
}

function fmtBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Wrapper mantido por compat com referências internas — delega ao helper canônico.
const fmtDate = formatDateBR

export const TOOLS: ZaiToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'list_events',
      description:
        'Lista os eventos disponíveis para inscrição na Semana Empresarial 2026. Use quando o usuário pergunta sobre eventos, programação, palestras, ou quer se inscrever em algo.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Opcional. Filtro de busca por título, descrição ou categoria.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_event_details',
      description:
        'Retorna detalhes completos de um evento específico (descrição, local, horários, vagas, preços).',
      parameters: {
        type: 'object',
        required: ['event_id'],
        properties: {
          event_id: {
            type: 'integer',
            description: 'ID do evento (vindo de list_events).',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lookup_inscriptions',
      description:
        'Busca todas as inscrições do usuário a partir do CPF. Use quando o usuário quer ver suas inscrições, status de pagamento, ingressos, etc.',
      parameters: {
        type: 'object',
        required: ['cpf'],
        properties: {
          cpf: {
            type: 'string',
            description: 'CPF do usuário (apenas 11 dígitos).',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_inscription_details',
      description:
        'Retorna detalhes completos de uma inscrição específica, incluindo URL do ingresso/QR code se confirmada e link de pagamento se pendente.',
      parameters: {
        type: 'object',
        required: ['order_number', 'cpf'],
        properties: {
          order_number: { type: 'string', description: 'Número do pedido.' },
          cpf: { type: 'string', description: 'CPF do dono da inscrição.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'retry_payment',
      description:
        'Gera um novo link de pagamento para uma inscrição pendente cujo link anterior expirou ou foi cancelado.',
      parameters: {
        type: 'object',
        required: ['order_number', 'cpf'],
        properties: {
          order_number: { type: 'string' },
          cpf: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_inscription',
      description:
        'Cancela uma inscrição PENDENTE de pagamento. ATENÇÃO: ação destrutiva. Sempre confirme com o usuário antes de chamar.',
      parameters: {
        type: 'object',
        required: ['order_number', 'cpf', 'confirmed'],
        properties: {
          order_number: { type: 'string' },
          cpf: { type: 'string' },
          confirmed: {
            type: 'boolean',
            description:
              'true apenas se o usuário confirmou explicitamente o cancelamento.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_payment_reminder',
      description:
        'Reenvia o lembrete de pagamento por email para uma inscrição pendente.',
      parameters: {
        type: 'object',
        required: ['order_number'],
        properties: {
          order_number: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_event_categories',
      description:
        'Lista as categorias de eventos disponíveis (para ajudar o usuário a filtrar).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_edition_info',
      description:
        'Retorna informações da edição atual da Semana Empresarial: datas, local, contatos, realizadores, números da edição anterior. Use para perguntas tipo "quando começa", "qual o tema", "onde é", "quem organiza".',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_past_editions',
      description:
        'Lista edições anteriores da Semana Empresarial (ano, título, números). Use para perguntas históricas tipo "quantas pessoas em 2024".',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_faq',
      description:
        'Busca na base de conhecimento institucional (FAQs, políticas, info do venue, como funciona). USE ANTES de improvisar respostas sobre certificado, reembolso, estacionamento, acessibilidade, transmissão, acompanhante, formas de pagamento, rodadas, meia-entrada, cupons.',
      parameters: {
        type: 'object',
        required: ['query'],
        properties: {
          query: {
            type: 'string',
            description:
              'Termos da pergunta do usuário (ex: "certificado", "reembolso", "estacionamento").',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_faq_topics',
      description:
        'Lista todas as perguntas disponíveis na base de conhecimento (sem responder). Útil quando o usuário pergunta "o que você sabe?" ou para sugerir tópicos.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['faq', 'venue', 'policy', 'how_it_works', 'other'],
            description: 'Opcional. Filtra por categoria.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_legal_summary',
      description:
        'Retorna resumo dos termos de uso ou política de privacidade (lista de tópicos + URL pública). NÃO devolve o texto integral. Use quando o usuário pergunta sobre termos, privacidade, LGPD.',
      parameters: {
        type: 'object',
        required: ['slug'],
        properties: {
          slug: {
            type: 'string',
            enum: ['terms', 'privacy'],
            description: '"terms" para termos de uso, "privacy" para privacidade.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_organizers',
      description:
        'Lista as instituições realizadoras da Semana Empresarial (ACIA, SICA, CDL, SEBRAE).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_partners',
      description:
        'Lista parceiros e patrocinadores ativos cadastrados na plataforma. Use quando o usuário pergunta "quem patrocina", "quais parceiros".',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_exhibitors',
      description:
        'Lista expositores aprovados da feira (público — sem CPF/email/telefone). Use para "quais empresas vão expor", "tem stand de [segmento]".',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Opcional. Filtro por nome ou segmento.',
          },
        },
      },
    },
  },
]

type ToolResult = Record<string, unknown> | { error: string }

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'list_events':
        return await toolListEvents((args.query as string) || '')
      case 'get_event_details':
        return await toolGetEventDetails(Number(args.event_id))
      case 'lookup_inscriptions':
        return await toolLookupInscriptions(cleanCpf(String(args.cpf || '')))
      case 'get_inscription_details':
        return await toolGetInscriptionDetails(
          String(args.order_number || ''),
          cleanCpf(String(args.cpf || '')),
        )
      case 'retry_payment':
        return await toolRetryPayment(
          String(args.order_number || ''),
          cleanCpf(String(args.cpf || '')),
        )
      case 'cancel_inscription':
        return await toolCancelInscription(
          String(args.order_number || ''),
          cleanCpf(String(args.cpf || '')),
          Boolean(args.confirmed),
        )
      case 'send_payment_reminder':
        return await toolSendReminder(String(args.order_number || ''))
      case 'get_event_categories':
        return await toolListCategories()
      case 'get_edition_info':
        return toolGetEditionInfo()
      case 'get_past_editions':
        return await toolGetPastEditions()
      case 'search_faq':
        return await toolSearchFaq(String(args.query || ''))
      case 'list_faq_topics':
        return await toolListFaqTopics(
          (args.category as string | undefined) || undefined,
        )
      case 'get_legal_summary':
        return await toolGetLegalSummary(String(args.slug || ''))
      case 'get_organizers':
        return toolGetOrganizers()
      case 'get_partners':
        return await toolGetPartners()
      case 'get_exhibitors':
        return await toolGetExhibitors((args.query as string) || '')
      default:
        return { error: `Ferramenta desconhecida: ${name}` }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return { error: msg }
  }
}

// -----------------------------------------------------------------------------
// Implementations
// -----------------------------------------------------------------------------

async function toolListEvents(query: string) {
  const supabase = createAdminClient()
  const today = todayInBrazil()

  let q = supabase
    .from('events')
    .select(
      'id, title, category, event_date, start_time, end_time, location, capacity, price, half_price, status',
    )
    .eq('status', 'active')
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(20)

  if (query && query.trim().length > 0) {
    q = q.or(
      `title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`,
    )
  }

  const { data, error } = await q
  if (error) return { error: error.message }

  return {
    count: data?.length ?? 0,
    events: (data ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      date: fmtDate(e.event_date),
      time: e.start_time?.slice(0, 5),
      end_time: e.end_time?.slice(0, 5),
      location: e.location,
      price: e.price > 0 ? fmtBRL(e.price) : 'Gratuito',
      half_price: e.half_price > 0 ? fmtBRL(e.half_price) : null,
      capacity: e.capacity,
      url: `${SITE_URL}/inscricoes/${e.id}`,
    })),
  }
}

async function toolGetEventDetails(eventId: number) {
  if (!Number.isFinite(eventId)) return { error: 'event_id inválido' }
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (error || !data) return { error: 'Evento não encontrado' }

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    category: data.category,
    date: fmtDate(data.event_date),
    start_time: data.start_time?.slice(0, 5),
    end_time: data.end_time?.slice(0, 5),
    location: data.location,
    capacity: data.capacity,
    price: data.price > 0 ? fmtBRL(data.price) : 'Gratuito',
    half_price: data.half_price > 0 ? fmtBRL(data.half_price) : null,
    status: data.status,
    url: `${SITE_URL}/inscricoes/${data.id}`,
  }
}

async function toolLookupInscriptions(cpf: string) {
  if (cpf.length !== 11) return { error: 'CPF inválido. Informe os 11 dígitos.' }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('inscriptions')
    .select(
      `id, order_number, quantity, total_amount, payment_status, payment_url,
       created_at, event_id,
       events!inner ( title, event_date, start_time, location )`,
    )
    .eq('cpf', cpf)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  if (!data || data.length === 0) {
    return {
      count: 0,
      message: 'Nenhuma inscrição encontrada para este CPF.',
    }
  }

  return {
    count: data.length,
    inscriptions: data.map((i: any) => ({
      order_number: i.order_number,
      event: i.events?.title,
      event_date: fmtDate(i.events?.event_date),
      event_time: i.events?.start_time?.slice(0, 5),
      location: i.events?.location,
      quantity: i.quantity,
      total: fmtBRL(i.total_amount),
      status: i.payment_status,
      created_at: formatDateBR(i.created_at),
      payment_url: i.payment_status === 'pending' ? i.payment_url : null,
    })),
  }
}

async function toolGetInscriptionDetails(orderNumber: string, cpf: string) {
  if (!orderNumber) return { error: 'order_number obrigatório' }
  if (cpf.length !== 11) return { error: 'CPF inválido' }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('inscriptions')
    .select(
      `id, order_number, nome, email, quantity, total_amount, payment_status,
       payment_url, qr_code, purchase_group, created_at,
       events!inner ( id, title, event_date, start_time, end_time, location )`,
    )
    .eq('order_number', orderNumber)
    .eq('cpf', cpf)
    .single()

  if (error || !data) return { error: 'Inscrição não encontrada para este CPF.' }

  const ev: any = data.events
  return {
    order_number: data.order_number,
    nome: data.nome,
    email: data.email,
    event: ev?.title,
    event_date: fmtDate(ev?.event_date),
    event_time: ev?.start_time?.slice(0, 5),
    event_end_time: ev?.end_time?.slice(0, 5),
    location: ev?.location,
    quantity: data.quantity,
    total: fmtBRL(data.total_amount),
    status: data.payment_status,
    payment_url: data.payment_status === 'pending' ? data.payment_url : null,
    ticket_url:
      data.payment_status === 'confirmed' || data.payment_status === 'free'
        ? `${SITE_URL}/confirmacao/${data.order_number}`
        : null,
    has_qr_code: Boolean(data.qr_code),
    created_at: formatDateTimeBR(data.created_at),
  }
}

async function toolRetryPayment(orderNumber: string, cpf: string) {
  if (!orderNumber || cpf.length !== 11)
    return { error: 'Informe order_number e CPF válido (11 dígitos).' }

  const supabase = createAdminClient()
  const { data: inscription, error } = await supabase
    .from('inscriptions')
    .select('*')
    .eq('order_number', orderNumber)
    .eq('cpf', cpf)
    .eq('payment_status', 'pending')
    .single()

  if (error || !inscription) {
    return { error: 'Inscrição pendente não encontrada para este CPF.' }
  }
  if (!inscription.payment_id) return { error: 'Pagamento não encontrado.' }

  const asaasPayment = await getPaymentStatus(inscription.payment_id)

  if (asaasPayment.status === 'PENDING' || asaasPayment.status === 'ACTIVE') {
    return {
      success: true,
      payment_url: inscription.payment_url,
      message: 'Link de pagamento ainda válido.',
    }
  }

  if (['OVERDUE', 'CANCELLED', 'REFUNDED'].includes(asaasPayment.status)) {
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 3)

    const { data: event } = await supabase
      .from('events')
      .select('title')
      .eq('id', inscription.event_id)
      .single()

    const isLocalhost =
      SITE_URL.includes('localhost') || SITE_URL.includes('127.0.0.1')

    const newPayment = await createPayment({
      customer: inscription.asaas_customer_id!,
      billingType: 'UNDEFINED',
      value: inscription.total_amount,
      dueDate: dueDate.toISOString().split('T')[0],
      description: `Inscrição ${inscription.order_number} - ${event?.title || 'Evento'}`,
      externalReference: inscription.order_number!,
      ...(!isLocalhost && {
        callback: {
          successUrl: `${SITE_URL}/pagamento/retorno?order=${inscription.order_number}`,
          autoRedirect: true,
        },
      }),
    })

    await supabase
      .from('inscriptions')
      .update({
        payment_id: newPayment.id,
        payment_url: newPayment.invoiceUrl,
      })
      .eq('id', inscription.id)

    return {
      success: true,
      payment_url: newPayment.invoiceUrl,
      message: 'Novo link de pagamento gerado.',
    }
  }

  return {
    error: `Status atual do pagamento (${asaasPayment.status}) não permite gerar novo link.`,
  }
}

async function toolCancelInscription(
  orderNumber: string,
  cpf: string,
  confirmed: boolean,
) {
  if (!confirmed) {
    return {
      error:
        'Cancelamento não confirmado. Peça confirmação explícita ao usuário antes de tentar de novo.',
    }
  }
  if (!orderNumber || cpf.length !== 11)
    return { error: 'order_number e CPF válido (11 dígitos) são obrigatórios.' }

  const supabase = createAdminClient()
  const { data: inscription, error } = await supabase
    .from('inscriptions')
    .select('id, payment_status')
    .eq('order_number', orderNumber)
    .eq('cpf', cpf)
    .eq('payment_status', 'pending')
    .single()

  if (error || !inscription) {
    return { error: 'Inscrição pendente não encontrada para este CPF.' }
  }

  const { error: updErr } = await supabase
    .from('inscriptions')
    .update({ payment_status: 'cancelled' })
    .eq('id', inscription.id)

  if (updErr) return { error: updErr.message }

  return {
    success: true,
    message: `Inscrição ${orderNumber} cancelada com sucesso.`,
  }
}

async function toolSendReminder(orderNumber: string) {
  if (!orderNumber) return { error: 'order_number obrigatório' }

  const res = await fetch(`${SITE_URL}/api/email/pending-reminder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_number: orderNumber }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { error: data?.error || 'Falha ao enviar lembrete.' }
  }
  return { success: true, message: 'Lembrete enviado para o email cadastrado.' }
}

async function toolListCategories() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('events')
    .select('category')
    .eq('status', 'active')
  if (error) return { error: error.message }
  const cats = Array.from(
    new Set((data ?? []).map((d: any) => d.category).filter(Boolean)),
  )
  return { categories: cats }
}

// -----------------------------------------------------------------------------
// Tools institucionais (edição, FAQ, jurídico, parceiros, expositores)
// -----------------------------------------------------------------------------

function toolGetEditionInfo() {
  const supabase = createAdminClient()
  // Busca edição atual no DB (assíncrono dentro de função síncrona não dá certo;
  // como a edição "atual" é a configurada no .ts, devolvemos isso e
  // complementamos com DB se houver)
  return (async () => {
    const { data: editionRow } = await supabase
      .from('editions')
      .select('id, year, ordinal, title, description, stats')
      .eq('year', EDITION_CONFIG.year)
      .maybeSingle()

    return {
      ordinal: EDITION_CONFIG.ordinal,
      year: EDITION_CONFIG.year,
      start_date: fmtDate(EDITION_CONFIG.startDate),
      end_date: fmtDate(EDITION_CONFIG.endDate),
      city: EDITION_CONFIG.city,
      state: EDITION_CONFIG.state,
      region: EDITION_CONFIG.region,
      contact: {
        email: EDITION_CONFIG.contact.email,
        whatsapp: EDITION_CONFIG.contact.whatsappDisplay,
      },
      social: {
        instagram: `@${EDITION_CONFIG.social.instagram}`,
        instagram_url: EDITION_CONFIG.social.instagramUrl,
        facebook_url: EDITION_CONFIG.social.facebookUrl,
      },
      organizers: EDITION_CONFIG.organizers.map((o) => ({
        name: o.name,
        full_name: o.full,
      })),
      stats_2025: {
        participants: EDITION_CONFIG.stats2025.participants,
        companies: EDITION_CONFIG.stats2025.companies,
        exhibitors: EDITION_CONFIG.stats2025.exhibitors,
        business_generated_brl: EDITION_CONFIG.stats2025.businessGenerated,
        credit_mobilized_brl: EDITION_CONFIG.stats2025.creditMobilized,
      },
      exhibitor_deadlines_2026: {
        pre_reserva: fmtDate(EDITION_CONFIG.exhibitorDeadlines.preReserva),
        pagamento: fmtDate(EDITION_CONFIG.exhibitorDeadlines.pagamento),
        montagem: fmtDate(EDITION_CONFIG.exhibitorDeadlines.montagem),
        abertura_oficial: fmtDate(
          EDITION_CONFIG.exhibitorDeadlines.abertura.split('T')[0],
        ),
      },
      current_edition_db: editionRow
        ? {
            title: editionRow.title,
            description: editionRow.description,
            stats: editionRow.stats,
          }
        : null,
      site_urls: {
        home: SITE_URL,
        events: `${SITE_URL}/inscricoes`,
        my_inscriptions: `${SITE_URL}/carrinho?aba=confirmadas`,
        about: `${SITE_URL}/sobre`,
        editions: `${SITE_URL}/edicoes`,
        partners: `${SITE_URL}/parceiros`,
        exhibitors: `${SITE_URL}/expositores`,
      },
    }
  })()
}

async function toolGetPastEditions() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('editions')
    .select('year, ordinal, title, description, stats')
    .lt('year', EDITION_CONFIG.year)
    .order('year', { ascending: false })

  if (error) return { error: error.message }

  return {
    count: data?.length ?? 0,
    editions: (data ?? []).map((e: any) => ({
      year: e.year,
      ordinal: e.ordinal,
      title: e.title,
      description: e.description,
      stats: e.stats,
    })),
  }
}

async function toolSearchFaq(query: string) {
  const supabase = createAdminClient()
  const q = query.trim()

  let data: any[] | null = null
  let error: any = null

  if (q.length === 0) {
    const r = await supabase
      .from('chat_knowledge')
      .select('id, category, question, answer, keywords')
      .eq('active', true)
      .order('order_index', { ascending: true })
      .limit(10)
    data = r.data
    error = r.error
  } else {
    const like = `%${q}%`
    const r = await supabase
      .from('chat_knowledge')
      .select('id, category, question, answer, keywords')
      .eq('active', true)
      .or(`question.ilike.${like},answer.ilike.${like},keywords.cs.{${q.toLowerCase()}}`)
      .limit(5)
    data = r.data
    error = r.error
  }

  if (error) return { error: error.message }

  if (!data || data.length === 0) {
    return {
      count: 0,
      message:
        'Nenhuma resposta encontrada na base de conhecimento. Oriente o usuário a falar pelo WhatsApp para esclarecimentos específicos.',
    }
  }

  return {
    count: data.length,
    results: data.map((r: any) => ({
      category: r.category,
      question: r.question,
      answer: r.answer,
    })),
  }
}

async function toolListFaqTopics(category?: string) {
  const supabase = createAdminClient()
  let q = supabase
    .from('chat_knowledge')
    .select('category, question')
    .eq('active', true)
    .order('category', { ascending: true })
    .order('order_index', { ascending: true })

  if (category) q = q.eq('category', category)

  const { data, error } = await q
  if (error) return { error: error.message }

  const grouped: Record<string, string[]> = {}
  for (const row of data ?? []) {
    const c = (row as any).category as string
    if (!grouped[c]) grouped[c] = []
    grouped[c].push((row as any).question as string)
  }

  return { topics: grouped }
}

async function toolGetLegalSummary(slug: string) {
  if (slug !== 'terms' && slug !== 'privacy') {
    return { error: 'slug deve ser "terms" ou "privacy"' }
  }

  const supabase = createAdminClient()
  const { data: doc, error } = await supabase
    .from('legal_documents')
    .select('id, title, eyebrow, last_revision, intro')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !doc) {
    return { error: 'Documento legal não encontrado.' }
  }

  const { data: sections } = await supabase
    .from('legal_document_sections')
    .select('number, title')
    .eq('document_id', doc.id)
    .order('order_index', { ascending: true })

  const publicPath = slug === 'terms' ? '/termos' : '/privacidade'

  return {
    title: doc.title,
    eyebrow: doc.eyebrow,
    last_revision: doc.last_revision,
    intro: doc.intro,
    section_titles: (sections ?? []).map((s: any) =>
      s.number ? `${s.number}. ${s.title}` : s.title,
    ),
    public_url: `${SITE_URL}${publicPath}`,
  }
}

function toolGetOrganizers() {
  return {
    organizers: EDITION_CONFIG.organizers.map((o) => ({
      name: o.name,
      full_name: o.full,
    })),
  }
}

async function toolGetPartners() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('organizations')
    .select('name, type, website, description')
    .eq('status', 'active')
    .order('name', { ascending: true })

  if (error) return { error: error.message }

  return {
    count: data?.length ?? 0,
    partners: (data ?? []).map((p: any) => ({
      name: p.name,
      type: p.type,
      website: p.website,
      description: p.description,
    })),
  }
}

async function toolGetExhibitors(query: string) {
  const supabase = createAdminClient()
  let q = supabase
    .from('exhibitors')
    .select('company_name, segment, stand_number, description')
    .eq('status', 'approved')
    .order('company_name', { ascending: true })
    .limit(50)

  if (query && query.trim().length > 0) {
    const like = `%${query.trim()}%`
    q = q.or(`company_name.ilike.${like},segment.ilike.${like}`)
  }

  const { data, error } = await q
  if (error) return { error: error.message }

  return {
    count: data?.length ?? 0,
    exhibitors: (data ?? []).map((e: any) => ({
      company: e.company_name,
      segment: e.segment,
      stand: e.stand_number,
      description: e.description,
    })),
  }
}
