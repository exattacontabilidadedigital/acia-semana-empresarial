import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data: inscription, error } = await supabase
      .from('inscriptions')
      .select('*, events(*)')
      .eq('payment_id', id)
      .single()

    if (error || !inscription) {
      return NextResponse.json(
        { success: false, message: 'Inscrição não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      inscription: {
        id: inscription.id,
        order_number: inscription.order_number,
        payment_status: inscription.payment_status,
        nome: inscription.nome,
        email: inscription.email,
        quantity: inscription.quantity,
        total_price: inscription.total_price,
        event: inscription.events,
      },
    })
  } catch (error) {
    console.error('Erro ao buscar status do pagamento:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
