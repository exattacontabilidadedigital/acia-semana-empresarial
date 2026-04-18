import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const cpf = request.nextUrl.searchParams.get('cpf')?.replace(/\D/g, '')

    if (!cpf || cpf.length !== 11) {
      return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: inscriptions, error } = await supabase
      .from('inscriptions')
      .select(`
        id,
        order_number,
        nome,
        email,
        quantity,
        total_amount,
        payment_status,
        payment_url,
        payment_id,
        created_at,
        event_id,
        events!inner (
          title,
          event_date,
          start_time,
          location
        )
      `)
      .eq('cpf', cpf)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar inscrições:', error)
      return NextResponse.json({ error: 'Erro ao buscar inscrições' }, { status: 500 })
    }

    return NextResponse.json({ inscriptions: inscriptions || [] })
  } catch (error) {
    console.error('Erro ao buscar inscrições por CPF:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
