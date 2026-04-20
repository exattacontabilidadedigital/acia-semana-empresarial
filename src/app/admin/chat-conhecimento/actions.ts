'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_CATS = ['faq', 'venue', 'policy', 'how_it_works', 'other'] as const

function parseKeywords(raw: string): string[] | null {
  const list = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)
  return list.length > 0 ? Array.from(new Set(list)) : null
}

export async function createFaqAction(formData: FormData) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const category = String(formData.get('category') ?? 'faq')
  const question = String(formData.get('question') ?? '').trim()
  const answer = String(formData.get('answer') ?? '').trim()
  const keywordsRaw = String(formData.get('keywords') ?? '')
  const orderIndex = Number(formData.get('order_index') ?? 0)
  const active = formData.get('active') === 'on' || formData.get('active') === 'true'

  if (!VALID_CATS.includes(category as any)) {
    redirect(`/admin/chat-conhecimento?error=${encodeURIComponent('Categoria inválida.')}`)
  }
  if (!question || !answer) {
    redirect(`/admin/chat-conhecimento?error=${encodeURIComponent('Pergunta e resposta são obrigatórias.')}`)
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('chat_knowledge')
    .insert({
      category: category as any,
      question,
      answer,
      keywords: parseKeywords(keywordsRaw),
      order_index: Number.isFinite(orderIndex) ? orderIndex : 0,
      active,
      updated_by: user.id,
    })
    .select('id')
    .single()

  if (error || !data) {
    redirect(
      `/admin/chat-conhecimento?error=${encodeURIComponent(error?.message ?? 'Erro ao criar.')}`,
    )
  }

  revalidatePath('/admin/chat-conhecimento')
  redirect(`/admin/chat-conhecimento/${data.id}?saved=1`)
}

export async function updateFaqAction(formData: FormData) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = Number(formData.get('id'))
  const category = String(formData.get('category') ?? 'faq')
  const question = String(formData.get('question') ?? '').trim()
  const answer = String(formData.get('answer') ?? '').trim()
  const keywordsRaw = String(formData.get('keywords') ?? '')
  const orderIndex = Number(formData.get('order_index') ?? 0)
  const active = formData.get('active') === 'on' || formData.get('active') === 'true'

  if (!Number.isFinite(id) || id <= 0) {
    redirect(`/admin/chat-conhecimento?error=${encodeURIComponent('ID inválido.')}`)
  }
  if (!VALID_CATS.includes(category as any)) {
    redirect(`/admin/chat-conhecimento/${id}?error=${encodeURIComponent('Categoria inválida.')}`)
  }
  if (!question || !answer) {
    redirect(
      `/admin/chat-conhecimento/${id}?error=${encodeURIComponent('Pergunta e resposta são obrigatórias.')}`,
    )
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('chat_knowledge')
    .update({
      category: category as any,
      question,
      answer,
      keywords: parseKeywords(keywordsRaw),
      order_index: Number.isFinite(orderIndex) ? orderIndex : 0,
      active,
      updated_by: user.id,
    })
    .eq('id', id)

  if (error) {
    redirect(`/admin/chat-conhecimento/${id}?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/admin/chat-conhecimento')
  revalidatePath(`/admin/chat-conhecimento/${id}`)
  redirect(`/admin/chat-conhecimento/${id}?saved=1`)
}

export async function deleteFaqAction(formData: FormData) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = Number(formData.get('id'))
  if (!Number.isFinite(id) || id <= 0) {
    redirect(`/admin/chat-conhecimento?error=${encodeURIComponent('ID inválido.')}`)
  }

  const admin = createAdminClient()
  const { error } = await admin.from('chat_knowledge').delete().eq('id', id)

  if (error) {
    redirect(`/admin/chat-conhecimento?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/admin/chat-conhecimento')
  redirect(`/admin/chat-conhecimento?deleted=1`)
}

export async function toggleFaqAction(formData: FormData) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = Number(formData.get('id'))
  const next = formData.get('next') === 'true'

  if (!Number.isFinite(id) || id <= 0) {
    redirect(`/admin/chat-conhecimento?error=${encodeURIComponent('ID inválido.')}`)
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('chat_knowledge')
    .update({ active: next, updated_by: user.id })
    .eq('id', id)

  if (error) {
    redirect(`/admin/chat-conhecimento?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/admin/chat-conhecimento')
  redirect(`/admin/chat-conhecimento`)
}
