import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateCouponWithAssociate } from '@/lib/coupons'

const validateCouponSchema = z.object({
  code: z.string().min(1),
  // event_id pode vir como number ou string numérica do front
  event_id: z.union([z.number(), z.string().regex(/^\d+$/)]),
  cnpj: z.string().optional().nullable(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = validateCouponSchema.parse(body)
    const eventId = typeof data.event_id === 'number' ? data.event_id : Number(data.event_id)

    const supabase = createAdminClient()
    const result = await validateCouponWithAssociate(supabase, {
      code: data.code,
      eventId,
      cnpj: data.cnpj ?? null,
    })

    if (!result.ok) {
      return NextResponse.json({
        valid: false,
        message: result.message,
        requires_cnpj: result.code === 'requires_cnpj',
        error_code: result.code,
      })
    }

    return NextResponse.json({
      valid: true,
      discount_type: result.coupon.discount_type,
      discount_value: result.coupon.discount_value,
      scope: result.coupon.scope,
      associate_id: result.associate_id,
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
