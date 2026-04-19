import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/stands - Lista pública dos stands com status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const supabase = createAdminClient()

    let query = supabase
      .from('stands')
      .select('id, number, type, size, price, status, pos_x, pos_y, exhibitor_id')
      .order('number', { ascending: true })

    if (type) query = query.eq('type', type)

    const { data: stands, error } = await query

    if (error) {
      console.error('Erro ao listar stands:', error)
      return NextResponse.json({ error: 'Erro ao listar stands' }, { status: 500 })
    }

    return NextResponse.json({ stands: stands ?? [] })
  } catch (error) {
    console.error('Erro ao listar stands:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PATCH /api/stands - Admin ajusta status manual
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, status, exhibitor_id } = body

    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

    const supabase = createAdminClient()
    const update: Record<string, unknown> = {}
    if (status) update.status = status
    if (exhibitor_id !== undefined) update.exhibitor_id = exhibitor_id || null

    const { error } = await supabase.from('stands').update(update).eq('id', id)
    if (error) {
      console.error('Erro ao atualizar stand:', error)
      return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar stand:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
