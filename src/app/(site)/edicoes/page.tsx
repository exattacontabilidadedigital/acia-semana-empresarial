import { createServerSupabaseClient } from '@/lib/supabase/server'
import { parseVideoUrl } from '@/lib/video-url'
import EdicoesClient, {
  type Edition,
  type Photo,
  type Video,
} from './EdicoesClient'

export const dynamic = 'force-dynamic'

// Resolve a thumbnail no servidor pra vídeos que não têm capa salva no banco.
// - YouTube: parser já dá a URL previsível
// - Vimeo: oEmbed público (cache 24h)
// - Instagram: og:image da página (cache 1h pq URL da CDN expira mais rápido)
//   — recomendado o admin reeditar o vídeo pra persistir no Storage
async function resolveServerThumbnail(videoUrl: string): Promise<string | null> {
  const parsed = parseVideoUrl(videoUrl)
  if (parsed.thumbnailUrl) return parsed.thumbnailUrl
  if (parsed.platform === 'vimeo' && parsed.id) {
    try {
      const r = await fetch(
        `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${parsed.id}`,
        { next: { revalidate: 60 * 60 * 24 } }
      )
      if (r.ok) {
        const data = (await r.json()) as { thumbnail_url?: string }
        return data.thumbnail_url ?? null
      }
    } catch {
      /* ignora */
    }
  }
  if (parsed.platform === 'instagram') {
    try {
      const r = await fetch(videoUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html',
        },
        next: { revalidate: 60 * 60 },
      })
      if (r.ok) {
        const html = await r.text()
        const m =
          html.match(
            /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
          ) ||
          html.match(
            /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i
          )
        if (m) {
          return m[1]
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#x2F;/g, '/')
        }
      }
    } catch {
      /* ignora */
    }
  }
  return null
}

export default async function EdicoesPage() {
  const supabase = createServerSupabaseClient()

  const [{ data: editionsRaw }, { data: photosRaw }, { data: videosRaw }] =
    await Promise.all([
      supabase
        .from('editions')
        .select(
          'id, year, ordinal, title, description, color, cover_url, press_kit_url, stats, order_index'
        )
        .eq('status', 'published')
        .order('order_index', { ascending: true })
        .order('year', { ascending: true }),
      supabase
        .from('gallery_photos')
        .select(
          'id, edition_id, url, caption, alt, size_hint, order_index, featured, editions:edition_id ( year, color )'
        )
        .order('order_index', { ascending: true })
        .order('id', { ascending: true }),
      supabase
        .from('gallery_videos')
        .select(
          'id, edition_id, video_url, caption, duration, color, thumbnail_url, featured, order_index, editions:edition_id ( year, color )'
        )
        .order('order_index', { ascending: true })
        .order('id', { ascending: true }),
    ])

  const editions: Edition[] = (editionsRaw ?? []).map((e: any) => ({
    year: e.year,
    n: e.ordinal ?? '',
    t: e.title,
    d: e.description ?? '',
    stats: Array.isArray(e.stats) ? (e.stats as [string, string][]) : [],
    c: e.color ?? 'var(--azul)',
    cover_url: e.cover_url,
    press_kit_url: e.press_kit_url,
  }))

  const photos: Photo[] = (photosRaw ?? []).map((p: any) => {
    const edYear = p.editions?.year ?? null
    const edColor = p.editions?.color ?? 'var(--azul)'
    return {
      id: p.id,
      cap: p.caption ?? '',
      ed: edYear ? String(edYear) : '—',
      c: edColor,
      span: (p.size_hint as Photo['span']) ?? undefined,
      url: p.url,
      alt: p.alt,
    }
  })

  const videos: Video[] = await Promise.all(
    (videosRaw ?? []).map(async (v: any) => {
      const edYear = v.editions?.year ?? null
      const edColor = v.color ?? v.editions?.color ?? 'var(--azul)'
      // Se o admin não salvou capa, tenta resolver dinamicamente (YouTube/Vimeo)
      const thumb =
        v.thumbnail_url || (await resolveServerThumbnail(v.video_url))
      return {
        id: String(v.id),
        cap: v.caption ?? '',
        ed: edYear ? String(edYear) : '—',
        dur: v.duration ?? '',
        c: edColor,
        feat: !!v.featured,
        url: v.video_url,
        thumb,
      }
    })
  )

  return <EdicoesClient editions={editions} photos={photos} videos={videos} />
}
