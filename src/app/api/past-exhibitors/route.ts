import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data } = await admin.rpc('is_admin', { user_id: user.id })
  if (!data) return null
  return user
}

const createSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  category: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  storage_path: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  order_index: z.number().int().optional(),
  active: z.boolean().optional(),
})

const updateSchema = createSchema.partial().extend({
  id: z.number().int().positive(),
})

// GET — lista (público vê só ativos; admin vê tudo se ?all=1)
export async function GET(req: NextRequest) {
  try {
    const all = req.nextUrl.searchParams.get('all') === '1'
    const supabase = createAdminClient()

    let query = supabase
      .from('past_exhibitors')
      .select('*')
      .order('order_index', { ascending: true })
      .order('id', { ascending: true })

    if (!all) query = query.eq('active', true)

    const { data, error } = await query
    if (error) {
      // Tabela ainda não criada — devolve lista vazia para não quebrar a UI
      // (admin precisa rodar a migração 024_past_exhibitors.sql).
      if (error.code === '42P01' || /past_exhibitors/i.test(error.message ?? '')) {
        return NextResponse.json({
          exhibitors: [],
          warning:
            'Tabela past_exhibitors não existe. Rode a migração 024_past_exhibitors.sql no Supabase.',
        })
      }
      throw error
    }

    return NextResponse.json({ exhibitors: data ?? [] })
  } catch (error) {
    console.error('Erro ao listar past_exhibitors:', error)
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST — cria nova marca (admin)
export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin()
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })

    const body = await req.json()
    const data = createSchema.parse(body)

    const supabase = createAdminClient()
    const { data: inserted, error } = await supabase
      .from('past_exhibitors')
      .insert({
        name: data.name,
        category: data.category || null,
        logo_url: data.logo_url || null,
        storage_path: data.storage_path || null,
        color: data.color || null,
        order_index: data.order_index ?? 0,
        active: data.active ?? true,
        created_by: user.id,
      })
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json({ exhibitor: inserted })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }
    console.error('Erro ao criar past_exhibitor:', error)
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH — atualiza marca (admin)
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAdmin()
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })

    const body = await req.json()
    const { id, ...rest } = updateSchema.parse(body)

    const updates: Record<string, unknown> = {}
    if (rest.name !== undefined) updates.name = rest.name
    if (rest.category !== undefined) updates.category = rest.category || null
    if (rest.logo_url !== undefined) updates.logo_url = rest.logo_url || null
    if (rest.storage_path !== undefined) updates.storage_path = rest.storage_path || null
    if (rest.color !== undefined) updates.color = rest.color || null
    if (rest.order_index !== undefined) updates.order_index = rest.order_index
    if (rest.active !== undefined) updates.active = rest.active

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('past_exhibitors')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json({ exhibitor: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }
    console.error('Erro ao atualizar past_exhibitor:', error)
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE — remove marca (admin) e remove logo do storage
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAdmin()
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })

    const id = Number(req.nextUrl.searchParams.get('id'))
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

    const supabase = createAdminClient()
    const { data: row } = await supabase
      .from('past_exhibitors')
      .select('storage_path')
      .eq('id', id)
      .single()

    const { error } = await supabase.from('past_exhibitors').delete().eq('id', id)
    if (error) throw error

    if (row?.storage_path) {
      await supabase.storage.from('events').remove([row.storage_path]).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao remover past_exhibitor:', error)
    const message = error instanceof Error ? error.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
