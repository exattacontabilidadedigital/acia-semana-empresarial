import type { SupabaseClient } from '@supabase/supabase-js'

export type CouponDiscountType = 'percentage' | 'fixed'
export type CouponScope = 'public' | 'associates_all' | 'associates_specific'

export type CouponValidation =
  | {
      ok: true
      coupon: {
        id: number
        code: string
        discount_type: CouponDiscountType
        discount_value: number
        scope: CouponScope
      }
      associate_id: string | null
    }
  | {
      ok: false
      code:
        | 'not_found'
        | 'inactive'
        | 'wrong_event'
        | 'not_started'
        | 'expired'
        | 'limit_reached'
        | 'requires_cnpj'
        | 'invalid_cnpj'
        | 'not_in_associate_list'
        | 'limit_per_associate_reached'
      message: string
    }

/**
 * Valida um cupom contra um evento, opcionalmente checando vínculo
 * com associado (quando o cupom tem scope associate-only).
 *
 * Reutilizado pelo endpoint público /api/coupons/validate e pelo
 * checkout /api/cart/checkout.
 */
export async function validateCouponWithAssociate(
  supabase: SupabaseClient,
  params: {
    code: string
    eventId: number
    cnpj?: string | null
  }
): Promise<CouponValidation> {
  const code = params.code.trim().toUpperCase()
  if (!code) return { ok: false, code: 'not_found', message: 'Código inválido.' }

  const { data: coupon } = await supabase
    .from('coupons')
    .select(
      'id, code, discount_type, discount_value, max_uses, current_uses, valid_from, valid_until, active, event_id, scope, max_uses_per_associate'
    )
    .eq('code', code)
    .maybeSingle()

  if (!coupon) {
    return {
      ok: false,
      code: 'not_found',
      message: 'Cupom inválido ou inexistente. Verifique o código digitado.',
    }
  }
  if (!coupon.active) {
    return {
      ok: false,
      code: 'inactive',
      message: 'Este cupom foi desativado pela organização.',
    }
  }
  if (coupon.event_id !== null && coupon.event_id !== params.eventId) {
    return {
      ok: false,
      code: 'wrong_event',
      message: 'Este cupom não vale para este evento.',
    }
  }

  const now = new Date()
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    const starts = formatBrazilianDate(coupon.valid_from)
    return {
      ok: false,
      code: 'not_started',
      message: `Este cupom ainda não está válido. Válido a partir de ${starts}.`,
    }
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    const expired = formatBrazilianDate(coupon.valid_until)
    return {
      ok: false,
      code: 'expired',
      message: `Este cupom expirou em ${expired}.`,
    }
  }
  if (
    coupon.max_uses !== null &&
    coupon.max_uses !== undefined &&
    coupon.current_uses >= coupon.max_uses
  ) {
    return {
      ok: false,
      code: 'limit_reached',
      message: `Cupom esgotado — o limite de ${coupon.max_uses} usos já foi atingido.`,
    }
  }

  const scope = (coupon.scope ?? 'public') as CouponScope

  // Cupom público — não exige CNPJ
  if (scope === 'public') {
    return {
      ok: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type as CouponDiscountType,
        discount_value: Number(coupon.discount_value),
        scope,
      },
      associate_id: null,
    }
  }

  // Daqui pra baixo: scope é associates_all ou associates_specific
  const cnpjDigits = (params.cnpj ?? '').replace(/\D/g, '')
  if (!cnpjDigits) {
    return {
      ok: false,
      code: 'requires_cnpj',
      message: 'Este cupom é exclusivo para associados ACIA. Informe o CNPJ da empresa associada.',
    }
  }
  if (cnpjDigits.length !== 14) {
    return {
      ok: false,
      code: 'invalid_cnpj',
      message: 'CNPJ incompleto — preencha os 14 dígitos.',
    }
  }

  // Resolve associate via helper SQL (compara só dígitos)
  const { data: assocRows } = await supabase
    .from('associates')
    .select('id, cnpj, status')
    .eq('status', 'active')

  const associate = (assocRows ?? []).find(
    (a: any) => (a.cnpj ?? '').replace(/\D/g, '') === cnpjDigits
  )

  if (!associate) {
    return {
      ok: false,
      code: 'invalid_cnpj',
      message:
        'Este CNPJ não está cadastrado como associado ativo da ACIA. Entre em contato com a associação para regularizar.',
    }
  }

  // Específico — confere vínculo
  if (scope === 'associates_specific') {
    const { data: link } = await supabase
      .from('coupon_associates')
      .select('coupon_id')
      .eq('coupon_id', coupon.id)
      .eq('associate_id', associate.id)
      .maybeSingle()

    if (!link) {
      return {
        ok: false,
        code: 'not_in_associate_list',
        message:
          'Este cupom não está disponível para o seu CNPJ. Procure por um cupom específico da sua empresa.',
      }
    }
  }

  // Limite por associado
  if (
    coupon.max_uses_per_associate !== null &&
    coupon.max_uses_per_associate !== undefined
  ) {
    const { count: usedByAssoc } = await supabase
      .from('inscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)
      .eq('associate_id', associate.id)
      .in('payment_status', ['confirmed', 'free'])

    if ((usedByAssoc ?? 0) >= coupon.max_uses_per_associate) {
      return {
        ok: false,
        code: 'limit_per_associate_reached',
        message: `Sua empresa já utilizou o limite de ${coupon.max_uses_per_associate} uso(s) deste cupom.`,
      }
    }
  }

  return {
    ok: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type as CouponDiscountType,
      discount_value: Number(coupon.discount_value),
      scope,
    },
    associate_id: associate.id,
  }
}

function formatBrazilianDate(value: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return value
  }
}

/**
 * Aplica o desconto a um valor base (preço unitário * quantidade).
 * Não permite total negativo.
 */
export function applyCouponDiscount(
  baseTotal: number,
  coupon: { discount_type: CouponDiscountType; discount_value: number },
  quantity: number
): number {
  if (coupon.discount_type === 'percentage') {
    return Math.max(0, baseTotal * (1 - coupon.discount_value / 100))
  }
  // fixed
  return Math.max(0, baseTotal - coupon.discount_value * quantity)
}
