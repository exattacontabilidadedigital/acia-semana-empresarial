'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/avif']

export async function uploadPhotosAction(formData: FormData) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/galeria')

  const editionRaw = String(formData.get('edition_id') ?? '').trim()
  const editionId = editionRaw && editionRaw !== '0' ? Number(editionRaw) : null
  const files = formData.getAll('photos') as File[]

  if (!files || files.length === 0 || files.every((f) => f.size === 0)) {
    redirect(
      `/admin/galeria${editionId ? `?edicao=${editionId}` : ''}&error=${encodeURIComponent('Selecione pelo menos uma imagem.')}`
    )
  }

  const admin = createAdminClient()
  const folder = editionId ? `edition-${editionId}` : 'unassigned'
  const errors: string[] = []
  let uploaded = 0

  for (const file of files) {
    if (file.size === 0) continue
    if (!ACCEPTED.includes(file.type)) {
      errors.push(`${file.name}: formato não suportado`)
      continue
    }
    if (file.size > MAX_BYTES) {
      errors.push(`${file.name}: maior que 10MB`)
      continue
    }

    const ext = file.name.split('.').pop() || 'png'
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext.toLowerCase()}`

    const { error: upErr } = await admin.storage
      .from('gallery')
      .upload(path, file, { contentType: file.type })
    if (upErr) {
      errors.push(`${file.name}: ${upErr.message}`)
      continue
    }
    const { data: urlData } = admin.storage.from('gallery').getPublicUrl(path)

    const { error: insErr } = await admin.from('gallery_photos').insert({
      edition_id: editionId,
      url: urlData.publicUrl,
      storage_path: path,
      created_by: user.id,
    })
    if (insErr) {
      errors.push(`${file.name}: ${insErr.message}`)
      continue
    }
    uploaded++
  }

  revalidatePath('/admin/galeria')
  revalidatePath('/edicoes')

  const params = new URLSearchParams()
  if (editionId) params.set('edicao', String(editionId))
  params.set('uploaded', String(uploaded))
  if (errors.length > 0) params.set('upload_errors', String(errors.length))
  redirect(`/admin/galeria?${params.toString()}`)
}

export async function updatePhotoAction(formData: FormData) {
  const id = String(formData.get('id'))
  const editionRaw = String(formData.get('edition_id') ?? '').trim()
  const sizeHint = String(formData.get('size_hint') ?? '').trim()
  const orderRaw = String(formData.get('order_index') ?? '').trim()

  const patch: Record<string, any> = {
    edition_id: editionRaw && editionRaw !== '0' ? Number(editionRaw) : null,
    caption: String(formData.get('caption') ?? '').trim() || null,
    alt: String(formData.get('alt') ?? '').trim() || null,
    size_hint: sizeHint || null,
    featured: formData.get('featured') === 'on',
    order_index: orderRaw ? Number(orderRaw) : 0,
  }

  const admin = createAdminClient()
  await admin.from('gallery_photos').update(patch).eq('id', id)

  revalidatePath('/admin/galeria')
  revalidatePath('/edicoes')
}

export async function deletePhotoAction(formData: FormData) {
  const id = String(formData.get('id'))
  const admin = createAdminClient()

  const { data: photo } = await admin
    .from('gallery_photos')
    .select('storage_path')
    .eq('id', id)
    .maybeSingle()

  if (photo?.storage_path) {
    await admin.storage.from('gallery').remove([photo.storage_path])
  }
  await admin.from('gallery_photos').delete().eq('id', id)

  revalidatePath('/admin/galeria')
  revalidatePath('/edicoes')
}
