import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePartnerApi } from '@/lib/auth'

const BUCKET = 'events'

function safeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .slice(0, 80)
}

function orgPath(orgId: string, file: string): string {
  return `org-materials/${orgId}/${file}`
}

// POST: upload de novo arquivo
export async function POST(request: Request) {
  try {
    const auth = await requirePartnerApi('upload_materials')
    if ('error' in auth) return auth.error

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Arquivo obrigatório' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const filename = `${Date.now()}-${safeName(file.name)}`
    const path = orgPath(auth.org.id, filename)
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl, path })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE: remove arquivo (precisa pertencer à org ativa)
export async function DELETE(request: Request) {
  try {
    const auth = await requirePartnerApi('upload_materials')
    if ('error' in auth) return auth.error

    const { path } = await request.json()
    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'path obrigatório' }, { status: 400 })
    }

    const expectedPrefix = `org-materials/${auth.org.id}/`
    if (!path.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
