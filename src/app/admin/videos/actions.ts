'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseVideoUrl } from '@/lib/video-url'

const MAX_THUMB_BYTES = 5 * 1024 * 1024
const ACCEPTED_THUMB = ['image/png', 'image/jpeg', 'image/webp', 'image/avif']

function buildRedirect(editionId: number | null, params: Record<string, string>) {
  const sp = new URLSearchParams()
  if (editionId) sp.set('edicao', String(editionId))
  for (const [k, v] of Object.entries(params)) sp.set(k, v)
  return `/admin/videos${sp.toString() ? `?${sp.toString()}` : ''}`
}

// Faz upload da imagem de capa no bucket "gallery". Retorna URL pública ou null
// se nada foi enviado. Lança Error com mensagem amigável em caso de validação.
async function uploadThumbnailIfPresent(
  formData: FormData,
  admin: ReturnType<typeof createAdminClient>
): Promise<string | null> {
  const file = formData.get('thumbnail_file')
  if (!(file instanceof File) || file.size === 0) return null

  if (!ACCEPTED_THUMB.includes(file.type)) {
    throw new Error('Capa: formato não suportado (use PNG, JPG, WebP ou AVIF).')
  }
  if (file.size > MAX_THUMB_BYTES) {
    throw new Error('Capa: arquivo maior que 5MB.')
  }

  const ext = (file.name.split('.').pop() || 'png').toLowerCase()
  const path = `videos-thumbs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error: upErr } = await admin.storage
    .from('gallery')
    .upload(path, file, { contentType: file.type })
  if (upErr) throw new Error(`Capa: ${upErr.message}`)

  return admin.storage.from('gallery').getPublicUrl(path).data.publicUrl
}

// Busca a meta tag og:image da página do Instagram (capa do Reel/post).
// Tenta vários User-Agents porque o IG bloqueia muitos clientes — bots
// "amigos" da Meta (FacebookBot) e crawlers conhecidos costumam funcionar.
async function fetchInstagramOgImage(url: string): Promise<string | null> {
  const userAgents = [
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'Twitterbot/1.0',
    'WhatsApp/2.23.20.0',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ]

  const patterns = [
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    /<meta[^>]*name=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*itemprop=["']image["'][^>]*content=["']([^"']+)["']/i,
  ]

  for (const ua of userAgents) {
    try {
      const r = await fetch(url, {
        headers: {
          'User-Agent': ua,
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(8000),
      })
      if (!r.ok) continue
      const html = await r.text()
      for (const p of patterns) {
        const m = html.match(p)
        if (m) {
          const decoded = m[1]
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#x2F;/g, '/')
          // Sanity check: og:image deve ser URL absoluta
          if (decoded.startsWith('http')) return decoded
        }
      }
    } catch {
      // tenta próxima UA
    }
  }
  return null
}

// Fallback usando Microlink.io (free tier ~50 req/dia sem API key).
// Eles renderizam a página em headless browser, então passam pelo bloqueio
// do Instagram pra IPs de servidor.
async function fetchViaMicrolink(url: string): Promise<string | null> {
  try {
    const r = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(20000) }
    )
    if (!r.ok) return null
    const data = (await r.json()) as {
      status?: string
      data?: { image?: { url?: string } }
    }
    if (data.status === 'success' && data.data?.image?.url) {
      return data.data.image.url
    }
    return null
  } catch {
    return null
  }
}

// Baixa uma imagem externa e salva no bucket "gallery". Retorna URL pública
// estável. Necessário pra Instagram porque os links de CDN expiram.
async function persistExternalThumbnail(
  imageUrl: string,
  admin: ReturnType<typeof createAdminClient>
): Promise<string | null> {
  try {
    const r = await fetch(imageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) return null
    const contentType = r.headers.get('content-type') || 'image/jpeg'
    const buf = await r.arrayBuffer()
    if (buf.byteLength === 0) return null
    const ext = contentType.split('/').pop()?.split(';')[0] || 'jpg'
    const path = `videos-thumbs/auto-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`
    const { error } = await admin.storage
      .from('gallery')
      .upload(path, buf, { contentType })
    if (error) return null
    return admin.storage.from('gallery').getPublicUrl(path).data.publicUrl
  } catch {
    return null
  }
}

// Tenta resolver a thumbnail automaticamente quando o admin não informou nada.
// - YouTube: parser já dá a URL previsível
// - Vimeo: oEmbed público
// - Instagram: scraping de og:image + download pro Storage (URL persistente)
async function resolveAutoThumbnail(
  videoUrl: string,
  admin: ReturnType<typeof createAdminClient>
): Promise<string | null> {
  const parsed = parseVideoUrl(videoUrl)
  if (parsed.thumbnailUrl) return parsed.thumbnailUrl

  if (parsed.platform === 'vimeo' && parsed.id) {
    try {
      const r = await fetch(
        `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${parsed.id}`,
        { cache: 'no-store' }
      )
      if (r.ok) {
        const data = (await r.json()) as { thumbnail_url?: string }
        if (data.thumbnail_url) return data.thumbnail_url
      }
    } catch {
      /* ignora */
    }
  }

  if (parsed.platform === 'instagram') {
    // Tenta scraping direto primeiro (rápido e gratuito quando funciona).
    // Se o IG bloquear (login wall), cai no Microlink que usa headless browser.
    let ogImage = await fetchInstagramOgImage(videoUrl)
    if (!ogImage) ogImage = await fetchViaMicrolink(videoUrl)
    if (ogImage) {
      // Persiste no Storage porque a CDN do IG usa URLs assinadas que expiram.
      const persisted = await persistExternalThumbnail(ogImage, admin)
      if (persisted) return persisted
    }
  }

  return null
}

export async function createVideoAction(formData: FormData) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/videos')

  const editionRaw = String(formData.get('edition_id') ?? '').trim()
  const editionId = editionRaw && editionRaw !== '0' ? Number(editionRaw) : null
  const videoUrl = String(formData.get('video_url') ?? '').trim()
  const caption = String(formData.get('caption') ?? '').trim() || null
  const duration = String(formData.get('duration') ?? '').trim() || null
  const color = String(formData.get('color') ?? '').trim() || null
  const thumbnailUrlInput =
    String(formData.get('thumbnail_url') ?? '').trim() || null
  const orderRaw = String(formData.get('order_index') ?? '').trim()
  const featured = formData.get('featured') === 'on'

  if (!videoUrl) {
    redirect(
      buildRedirect(editionId, {
        error: 'Informe a URL do vídeo (YouTube, Vimeo ou Instagram).',
      })
    )
  }

  try {
    new URL(videoUrl)
  } catch {
    redirect(buildRedirect(editionId, { error: 'URL do vídeo inválida.' }))
  }

  const admin = createAdminClient()

  // Resolve a thumbnail final: arquivo > URL manual > auto-fetch
  let thumbnailUrl: string | null = null
  try {
    thumbnailUrl = await uploadThumbnailIfPresent(formData, admin)
  } catch (e: any) {
    redirect(buildRedirect(editionId, { error: e.message }))
  }
  if (!thumbnailUrl) thumbnailUrl = thumbnailUrlInput
  if (!thumbnailUrl) thumbnailUrl = await resolveAutoThumbnail(videoUrl, admin)

  const { error } = await admin.from('gallery_videos').insert({
    edition_id: editionId,
    video_url: videoUrl,
    caption,
    duration,
    color,
    thumbnail_url: thumbnailUrl,
    featured,
    order_index: orderRaw ? Number(orderRaw) : 0,
    created_by: user.id,
  })

  if (error) {
    redirect(buildRedirect(editionId, { error: error.message }))
  }

  revalidatePath('/admin/videos')
  revalidatePath('/edicoes')
  redirect(buildRedirect(editionId, { created: '1' }))
}

export async function updateVideoAction(formData: FormData) {
  const id = String(formData.get('id'))
  const editionRaw = String(formData.get('edition_id') ?? '').trim()
  const orderRaw = String(formData.get('order_index') ?? '').trim()
  const videoUrl = String(formData.get('video_url') ?? '').trim()

  if (videoUrl) {
    try {
      new URL(videoUrl)
    } catch {
      // ignora — mantém URL existente se inválida
    }
  }

  const admin = createAdminClient()

  // Upload de nova capa (se enviada). Sobrescreve thumbnail_url.
  let uploadedThumb: string | null = null
  try {
    uploadedThumb = await uploadThumbnailIfPresent(formData, admin)
  } catch {
    // ignora erro de capa em update — mantém valor anterior
  }

  const thumbnailField = String(formData.get('thumbnail_url') ?? '').trim()

  // Resolve thumbnail final: arquivo enviado > URL manual colada > auto-fetch
  // (YouTube/Vimeo/Instagram). O auto-fetch só roda se não há nada manual.
  let finalThumb: string | null =
    uploadedThumb ?? (thumbnailField || null)
  if (!finalThumb && videoUrl) {
    finalThumb = await resolveAutoThumbnail(videoUrl, admin)
  }

  const patch: Record<string, any> = {
    edition_id: editionRaw && editionRaw !== '0' ? Number(editionRaw) : null,
    video_url: videoUrl || undefined,
    caption: String(formData.get('caption') ?? '').trim() || null,
    duration: String(formData.get('duration') ?? '').trim() || null,
    color: String(formData.get('color') ?? '').trim() || null,
    thumbnail_url: finalThumb,
    featured: formData.get('featured') === 'on',
    order_index: orderRaw ? Number(orderRaw) : 0,
  }

  // Remove campos undefined (caso video_url tenha vindo vazio mantém o atual)
  for (const k of Object.keys(patch)) {
    if (patch[k] === undefined) delete patch[k]
  }

  await admin.from('gallery_videos').update(patch).eq('id', id)

  revalidatePath('/admin/videos')
  revalidatePath('/edicoes')
}

export async function deleteVideoAction(formData: FormData) {
  const id = String(formData.get('id'))
  const admin = createAdminClient()
  await admin.from('gallery_videos').delete().eq('id', id)

  revalidatePath('/admin/videos')
  revalidatePath('/edicoes')
}
