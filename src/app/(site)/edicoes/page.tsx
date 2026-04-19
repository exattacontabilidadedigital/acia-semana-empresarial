import { createServerSupabaseClient } from '@/lib/supabase/server'
import EdicoesClient, { type Edition, type Photo } from './EdicoesClient'

export const dynamic = 'force-dynamic'

export default async function EdicoesPage() {
  const supabase = createServerSupabaseClient()

  const [{ data: editionsRaw }, { data: photosRaw }] = await Promise.all([
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

  return <EdicoesClient editions={editions} photos={photos} />
}
