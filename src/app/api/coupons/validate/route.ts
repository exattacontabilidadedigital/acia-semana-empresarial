import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const validateCouponSchema = z.object({
  code: z.string().min(1),
  event_id: z.string().uuid(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = validateCouponSchema.parse(body)

    const supabase = createAdminClient()

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', data.code.toUpperCase())
      .eq('active', true)
      .single()

    if (error || !coupon) {
      return NextResponse.json({ valid: false, message: 'Cupom não encontrado' })
    }

    // Check max uses
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return NextResponse.json({ valid: false, message: 'Cupom esgotado' })
    }

    // Check date range
    const now = new Date()
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return NextResponse.json({ valid: false, message: 'Cupom ainda não está válido' })
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return NextResponse.json({ valid: false, message: 'Cupom expirado' })
    }

    // Check event-specific coupon
    if (coupon.event_id && coupon.event_id !== data.event_id) {
      return NextResponse.json({ valid: false, message: 'Cupom não válido para este evento' })
    }

    return NextResponse.json({
      valid: true,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { valid: false, message: 'Dados inválidos' },
        { status: 400 }
      )
    }

    console.error('Erro ao validar cupom:', error)
    return NextResponse.json(
      { valid: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
