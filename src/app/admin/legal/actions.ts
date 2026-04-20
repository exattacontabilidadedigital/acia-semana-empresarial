'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type SectionInput = {
  id?: number | null
  number: string
  title: string
  body: string
  order_index: number
}

/**
 * Atualiza meta do documento + sincroniza seções (insert/update/delete em lote).
 *
 * O FormData carrega:
 *  - document_id, slug, title, eyebrow, last_revision, intro
 *  - sections (JSON string com array de SectionInput)
 */
export async function updateLegalDocumentAction(formData: FormData) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const docId = Number(formData.get('document_id'))
  const slug = String(formData.get('slug') ?? '')
  const sectionsJson = String(formData.get('sections') ?? '[]')

  let sections: SectionInput[] = []
  try {
    sections = JSON.parse(sectionsJson)
  } catch {
    redirect(`/admin/legal/${slug}?error=${encodeURIComponent('Erro ao ler seções.')}`)
  }

  const docPatch = {
    title: String(formData.get('title') ?? '').trim(),
    eyebrow: String(formData.get('eyebrow') ?? '').trim() || null,
    last_revision: String(formData.get('last_revision') ?? '').trim() || null,
    intro: String(formData.get('intro') ?? '').trim() || null,
    updated_by: user.id,
  }

  if (!docPatch.title) {
    redirect(`/admin/legal/${slug}?error=${encodeURIComponent('Título é obrigatório.')}`)
  }

  const admin = createAdminClient()

  // 1. Atualiza meta
  const { error: docErr } = await admin
    .from('legal_documents')
    .update(docPatch)
    .eq('id', docId)

  if (docErr) {
    redirect(`/admin/legal/${slug}?error=${encodeURIComponent(docErr.message)}`)
  }

  // 2. Sync seções: pega ids existentes; deleta os que sumiram; upsert os outros
  const { data: existing } = await admin
    .from('legal_document_sections')
    .select('id')
    .eq('document_id', docId)
  const existingIds = new Set((existing ?? []).map((r: any) => r.id as number))
  const incomingIds = new Set(
    sections.map((s) => s.id).filter((id): id is number => typeof id === 'number')
  )
  const toDelete = Array.from(existingIds).filter((id) => !incomingIds.has(id))

  if (toDelete.length > 0) {
    await admin.from('legal_document_sections').delete().in('id', toDelete)
  }

  // Upsert seções
  for (const s of sections) {
    const payload = {
      document_id: docId,
      number: s.number?.trim() || null,
      title: s.title?.trim() ?? '',
      body: s.body ?? '',
      order_index: Number(s.order_index ?? 0),
    }
    if (!payload.title) continue
    if (s.id && existingIds.has(s.id)) {
      await admin.from('legal_document_sections').update(payload).eq('id', s.id)
    } else {
      await admin.from('legal_document_sections').insert(payload)
    }
  }

  revalidatePath('/admin/legal')
  revalidatePath(`/admin/legal/${slug}`)
  revalidatePath(`/${slug === 'terms' ? 'termos' : 'privacidade'}`)
  redirect(`/admin/legal/${slug}?saved=1`)
}
