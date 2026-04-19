'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Patch = Record<string, any>

function parseStatsText(raw: string): Array<[string, string]> {
  return raw
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [value, ...labelParts] = line.split('|').map((p) => p.trim())
      return [value ?? '', labelParts.join('|') || ''] as [string, string]
    })
}

function readPatch(formData: FormData): Patch {
  const yearStr = String(formData.get('year') ?? '').trim()
  const orderStr = String(formData.get('order_index') ?? '').trim()
  return {
    year: yearStr ? Number(yearStr) : null,
    ordinal: String(formData.get('ordinal') ?? '').trim() || null,
    title: String(formData.get('title') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim() || null,
    color: String(formData.get('color') ?? '').trim() || null,
    cover_url: String(formData.get('cover_url') ?? '').trim() || null,
    press_kit_url: String(formData.get('press_kit_url') ?? '').trim() || null,
    stats: parseStatsText(String(formData.get('stats_text') ?? '')),
    order_index: orderStr ? Number(orderStr) : 0,
  }
}

export async function createEditionAction(formData: FormData) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/edicoes')

  const patch = readPatch(formData)
  if (!patch.year || !patch.title) {
    redirect(
      `/admin/edicoes?error=${encodeURIComponent('Ano e título são obrigatórios.')}`
    )
  }
  if (patch.year < 2000 || patch.year > 2100) {
    redirect(`/admin/edicoes?error=${encodeURIComponent('Ano inválido.')}`)
  }

  const admin = createAdminClient()
  const { data: created, error } = await admin
    .from('editions')
    .insert({ ...patch, created_by: user.id })
    .select('id')
    .single()

  if (error || !created) {
    redirect(
      `/admin/edicoes?error=${encodeURIComponent(
        error?.message ?? 'Falha ao criar edição.'
      )}`
    )
  }

  revalidatePath('/admin/edicoes')
  revalidatePath('/edicoes')
  redirect(`/admin/edicoes/${created.id}?created=1`)
}

export async function updateEditionAction(formData: FormData) {
  const id = String(formData.get('id'))
  const patch = readPatch(formData)
  if (!patch.year || !patch.title) {
    redirect(
      `/admin/edicoes/${id}?error=${encodeURIComponent('Ano e título são obrigatórios.')}`
    )
  }
  const admin = createAdminClient()
  const { error } = await admin.from('editions').update(patch).eq('id', id)
  if (error) {
    redirect(`/admin/edicoes/${id}?error=${encodeURIComponent(error.message)}`)
  }
  revalidatePath('/admin/edicoes')
  revalidatePath(`/admin/edicoes/${id}`)
  revalidatePath('/edicoes')
  redirect(`/admin/edicoes/${id}?saved=1`)
}

export async function setEditionStatusAction(formData: FormData) {
  const id = String(formData.get('id'))
  const status = String(formData.get('status'))
  if (!['draft', 'published', 'archived'].includes(status)) return
  const admin = createAdminClient()
  await admin.from('editions').update({ status }).eq('id', id)
  revalidatePath('/admin/edicoes')
  revalidatePath(`/admin/edicoes/${id}`)
  revalidatePath('/edicoes')
}

export async function deleteEditionAction(formData: FormData) {
  const id = String(formData.get('id'))
  const admin = createAdminClient()
  await admin.from('editions').delete().eq('id', id)
  revalidatePath('/admin/edicoes')
  revalidatePath('/edicoes')
  redirect('/admin/edicoes')
}

export async function uploadEditionCoverAction(formData: FormData) {
  const id = String(formData.get('id'))
  const file = formData.get('cover') as File | null
  if (!file || file.size === 0) {
    redirect(`/admin/edicoes/${id}?error=${encodeURIComponent('Selecione uma imagem.')}`)
  }
  if (!file.type.startsWith('image/')) {
    redirect(`/admin/edicoes/${id}?error=${encodeURIComponent('Apenas imagens.')}`)
  }
  if (file.size > 5 * 1024 * 1024) {
    redirect(`/admin/edicoes/${id}?error=${encodeURIComponent('Imagem maior que 5MB.')}`)
  }

  const admin = createAdminClient()
  const ext = file.name.split('.').pop() || 'png'
  const path = `${id}/cover-${Date.now()}.${ext.toLowerCase()}`

  const { error: uploadErr } = await admin.storage
    .from('editions')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadErr) {
    redirect(
      `/admin/edicoes/${id}?error=${encodeURIComponent('Upload: ' + uploadErr.message)}`
    )
  }
  const { data: urlData } = admin.storage.from('editions').getPublicUrl(path)
  await admin.from('editions').update({ cover_url: urlData.publicUrl }).eq('id', id)

  revalidatePath('/admin/edicoes')
  revalidatePath(`/admin/edicoes/${id}`)
  revalidatePath('/edicoes')
  redirect(`/admin/edicoes/${id}?cover_saved=1`)
}
