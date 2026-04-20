/**
 * Configuração da edição atual da Semana Empresarial.
 * Source of truth para datas, contatos, realizadores, números 2025.
 *
 * Consumido por: páginas (Footer, HomeHero, sobre, expositores, etc.),
 * componentes (FloatingWhatsApp) e o chat IA (system-prompt + tools).
 */

export interface Organizer {
  name: string
  full: string
  logo: string
}

export const EDITION_CONFIG = {
  // -- Identidade da edição --
  ordinal: 6,
  year: 2026,
  startDate: '2026-08-17',
  endDate: '2026-08-22',
  // 08:00 horário de Brasília (UTC-3, sem horário de verão desde 2019)
  startDateTime: '2026-08-17T08:00:00-03:00',
  timezone: 'America/Sao_Paulo',
  city: 'Açailândia',
  state: 'MA',
  region: 'sudoeste maranhense',

  // -- Contatos institucionais --
  contact: {
    email: 'acia.aca@gmail.com',
    whatsappDigits: '5599988334432',
    whatsappDisplay: '+55 99 98833-4432',
    whatsappDefaultMessage:
      'Olá! Tenho interesse em saber mais sobre a Semana Empresarial de Açailândia 2026.',
  },

  // -- Redes sociais --
  social: {
    instagram: 'aciaacailandia',
    instagramUrl: 'https://www.instagram.com/aciaacailandia',
    facebook: 'aciaacailandia',
    facebookUrl: 'https://www.facebook.com/aciaacailandia',
    youtubeUrl: '',
  },

  // -- Realizadores institucionais --
  organizers: [
    {
      name: 'ACIA',
      full: 'Associação Comercial, Industrial e Serviços de Açailândia',
      logo: '/site/logo-acia.png',
    },
    {
      name: 'SICA',
      full: 'Sindicato do Comércio Varejista de Açailândia',
      logo: '/site/logo-sica.png',
    },
    {
      name: 'CDL',
      full: 'Câmara de Dirigentes Lojistas de Açailândia',
      logo: '/site/logo-cdl.png',
    },
    {
      name: 'SEBRAE',
      full: 'Serviço Brasileiro de Apoio às Micro e Pequenas Empresas',
      logo: '/site/logo-sebrae.png',
    },
  ] as Organizer[],

  // -- Números da edição anterior (2025) --
  stats2025: {
    participants: 7200,
    companies: 1000,
    exhibitors: 80,
    businessGenerated: 5290000, // R$ 5,29 mi
    creditMobilized: 1000000, // R$ 1 mi+
    socialReach: 688000,
    socialInteractions: 9600,
    sponsorshipQuotas: 16,
  },

  // -- Prazos para expositores 2026 --
  exhibitorDeadlines: {
    preReserva: '2026-07-20',
    pagamento: '2026-07-31',
    montagem: '2026-08-18',
    abertura: '2026-08-20T14:00:00',
    desmontagem: '2026-08-23',
  },
}

// -- Helpers de formatação --

export function formatEditionDateRange(): string {
  return `17 — 22 de agosto · ${EDITION_CONFIG.year}`
}

export function formatEditionDateRangeShort(): string {
  return '17 — 22.08'
}

export function whatsappLink(message?: string): string {
  const text = message ?? EDITION_CONFIG.contact.whatsappDefaultMessage
  return `https://wa.me/${EDITION_CONFIG.contact.whatsappDigits}?text=${encodeURIComponent(text)}`
}

// -----------------------------------------------------------------------------
// Helpers de data/hora pt-BR (sempre fuso de Brasília, independente do servidor)
// -----------------------------------------------------------------------------

const BR_TZ = EDITION_CONFIG.timezone

/** Data de "hoje" no fuso de Brasília no formato 'YYYY-MM-DD' (para queries SQL). */
export function todayInBrazil(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** Formata uma data ISO ('YYYY-MM-DD' ou ISO completo) como dd/mm/aaaa pt-BR. */
export function formatDateBR(input: string | null | undefined): string {
  if (!input) return ''
  // ISO date-only: parse manual para evitar shift de fuso
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/
  if (dateOnly.test(input)) {
    const [y, m, d] = input.split('-')
    return `${d}/${m}/${y}`
  }
  // Datetime ISO: usa Intl com fuso BR
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return input
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BR_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/** Formata um datetime completo como dd/mm/aaaa HH:MM pt-BR. */
export function formatDateTimeBR(input: string | null | undefined): string {
  if (!input) return ''
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return input
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BR_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

/** "segunda-feira, 19 de abril de 2026 · 14:32" em fuso BR. Para context da IA. */
export function nowFullBR(): string {
  const d = new Date()
  const dateStr = new Intl.DateTimeFormat('pt-BR', {
    timeZone: BR_TZ,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d)
  const timeStr = new Intl.DateTimeFormat('pt-BR', {
    timeZone: BR_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
  return `${dateStr} · ${timeStr}`
}
