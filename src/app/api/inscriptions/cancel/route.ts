import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
      .select('id, payment_status')
      .eq('order_number', order_number)
      .eq('cpf', cpfClean)
      .eq('payment_status', 'pending')
      .single()

    if (error || !inscription) {
      return NextResponse.json({ error: 'Inscrição pendente não encontrada' }, { status: 404 })
    }

    // Atualiza status para cancelled
    const { error: updateError } = await supabase
      .from('inscriptions')
      .update({ payment_status: 'cancelled' })
      .eq('id', inscription.id)

    if (updateError) {
      console.error('Erro ao cancelar inscrição:', updateError)
      return NextResponse.json({ error: 'Erro ao cancelar inscrição' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Erro ao cancelar inscrição:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
