'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function digits(s: string | null | undefined): string {
  return (s ?? '').replace(/\D/g, '')
}

function isValidCnpjLength(s: string): boolean {
  return digits(s).length === 14
}

type Patch = Record<string, any>

function readPatch(formData: FormData): Patch {
  return {
    razao_social: String(formData.get('razao_social') ?? '').trim(),
    nome_fantasia: String(formData.get('nome_fantasia') ?? '').trim() || null,
    cnpj: String(formData.get('cnpj') ?? '').trim(),
    segmento: String(formData.get('segmento') ?? '').trim() || null,
    contact_name: String(formData.get('contact_name') ?? '').trim() || null,
    email: String(formData.get('email') ?? '').trim().toLowerCase() || null,
    phone: String(formData.get('phone') ?? '').trim() || null,
    cep: String(formData.get('cep') ?? '').trim() || null,
    rua: String(formData.get('rua') ?? '').trim() || null,
    numero: String(formData.get('numero') ?? '').trim() || null,
    bairro: String(formData.get('bairro') ?? '').trim() || null,
    cidade: String(formData.get('cidade') ?? '').trim() || null,
    estado: String(formData.get('estado') ?? '').trim() || null,
    notes: String(formData.get('notes') ?? '').trim() || null,
  }
}

export async function createAssociateAction(formData: FormData) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/associados')

  const patch = readPatch(formData)

  if (!patch.razao_social || !patch.cnpj) {
    redirect(
      `/admin/associados?error=${encodeURIComponent(
        'Razão social e CNPJ são obrigatórios.'
      )}`
    )
  }
  if (!isValidCnpjLength(patch.cnpj)) {
    redirect(
      `/admin/associados?error=${encodeURIComponent('CNPJ deve ter 14 dígitos.')}`
    )
  }

  const admin = createAdminClient()

  // Confere unicidade comparando só dígitos
  const cnpjDigits = digits(patch.cnpj)
  const { data: existingRows } = await admin.from('associates').select('id, cnpj')
  const exists = (existingRows ?? []).some(
    (r: any) => digits(r.cnpj) === cnpjDigits
  )
  if (exists) {
    redirect(
      `/admin/associados?error=${encodeURIComponent('Já existe um associado com esse CNPJ.')}`
    )
  }

  const { data: created, error } = await admin
    .from('associates')
    .insert({ ...patch, created_by: user.id })
    .select('id')
    .single()

  if (error || !created) {
    redirect(
      `/admin/associados?error=${encodeURIComponent(
        error?.message ?? 'Falha ao criar associado.'
      )}`
    )
  }

  revalidatePath('/admin/associados')
  redirect(`/admin/associados/${created.id}?created=1`)
}

export async function updateAssociateAction(formData: FormData) {
  const id = String(formData.get('id'))
  const patch = readPatch(formData)

  if (!patch.razao_social || !patch.cnpj) {
    redirect(
      `/admin/associados/${id}?error=${encodeURIComponent(
        'Razão social e CNPJ são obrigatórios.'
      )}`
    )
  }
  if (!isValidCnpjLength(patch.cnpj)) {
    redirect(
      `/admin/associados/${id}?error=${encodeURIComponent(
        'CNPJ deve ter 14 dígitos.'
      )}`
    )
  }

  const admin = createAdminClient()
  const { error } = await admin.from('associates').update(patch).eq('id', id)
  if (error) {
    redirect(`/admin/associados/${id}?error=${encodeURIComponent(error.message)}`)
  }
  revalidatePath('/admin/associados')
  revalidatePath(`/admin/associados/${id}`)
  redirect(`/admin/associados/${id}?saved=1`)
}

export async function setAssociateStatusAction(formData: FormData) {
  const id = String(formData.get('id'))
  const status = String(formData.get('status'))
  if (!['active', 'inactive'].includes(status)) return
  const admin = createAdminClient()
  await admin.from('associates').update({ status }).eq('id', id)
  revalidatePath('/admin/associados')
  revalidatePath(`/admin/associados/${id}`)
}

export async function deleteAssociateAction(formData: FormData) {
  const id = String(formData.get('id'))
  const admin = createAdminClient()
  await admin.from('associates').delete().eq('id', id)
  revalidatePath('/admin/associados')
  redirect('/admin/associados')
}

export async function uploadAssociateLogoAction(formData: FormData) {
  const id = String(formData.get('id'))
  const file = formData.get('logo') as File | null

  if (!file || file.size === 0) {
    redirect(
      `/admin/associados/${id}?error=${encodeURIComponent('Selecione um arquivo de imagem.')}`
    )
  }
  if (!file.type.startsWith('image/')) {
    redirect(
      `/admin/associados/${id}?error=${encodeURIComponent('Apenas arquivos de imagem.')}`
    )
  }
  if (file.size > 2 * 1024 * 1024) {
    redirect(
      `/admin/associados/${id}?error=${encodeURIComponent('Imagem maior que 2MB.')}`
    )
  }

  const admin = createAdminClient()
  const ext = file.name.split('.').pop() || 'png'
  const path = `${id}/${Date.now()}.${ext.toLowerCase()}`

  const { error: uploadErr } = await admin.storage
    .from('associates')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadErr) {
    redirect(
      `/admin/associados/${id}?error=${encodeURIComponent('Falha no upload: ' + uploadErr.message)}`
    )
  }

  const { data: urlData } = admin.storage.from('associates').getPublicUrl(path)
  const logoUrl = urlData.publicUrl

  await admin.from('associates').update({ logo_url: logoUrl }).eq('id', id)

  revalidatePath('/admin/associados')
  revalidatePath(`/admin/associados/${id}`)
  redirect(`/admin/associados/${id}?logo_saved=1`)
}

export async function removeAssociateLogoAction(formData: FormData) {
  const id = String(formData.get('id'))
  const admin = createAdminClient()
  // Remove arquivos da pasta do associado
  const { data: files } = await admin.storage.from('associates').list(id)
  if (files && files.length > 0) {
    const paths = files.map((f) => `${id}/${f.name}`)
    await admin.storage.from('associates').remove(paths)
  }
  await admin.from('associates').update({ logo_url: null }).eq('id', id)
  revalidatePath('/admin/associados')
  revalidatePath(`/admin/associados/${id}`)
}
