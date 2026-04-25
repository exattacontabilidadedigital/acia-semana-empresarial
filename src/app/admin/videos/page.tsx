import Link from 'next/link'
import { Video, Filter, CheckCircle2 } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import VideoCreateModal from '@/components/admin/VideoCreateModal'
import VideoEditCard from '@/components/admin/VideoEditCard'
import Pagination from '@/components/ui/Pagination'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

export default async function AdminVideosPage({
  searchParams,
}: {
  searchParams: {
    edicao?: string
    error?: string
    created?: string
    pagina?: string
  }
}) {
  const supabase = createServerSupabaseClient()

  const editionFilter = searchParams.edicao ? Number(searchParams.edicao) : null
  const page = Math.max(1, Number(searchParams.pagina) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const [{ data: editions }, videosResp] = await Promise.all([
    supabase
      .from('editions')
      .select('id, year, title')
      .order('year', { ascending: false }),
    (() => {
      let q = supabase
        .from('gallery_videos')
        .select(
          'id, video_url, caption, duration, color, thumbnail_url, edition_id, featured, order_index, created_at',
          { count: 'exact' }
        )
        .order('order_index', { ascending: true })
        .order('id', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
      if (editionFilter === 0) q = q.is('edition_id', null)
      else if (editionFilter) q = q.eq('edition_id', editionFilter)
      return q
    })(),
  ])

  const videos = videosResp.data ?? []
  const count = videosResp.count
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="page-enter">
      <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="eyebrow mb-4">
            <span className="dot" />
            CONTEÚDO · VÍDEOS
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
            Galeria de vídeos
          </h1>
          <p
            className="mt-3"
            style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
          >
            Aftermovies, depoimentos e destaques que aparecem em{' '}
            <code>/edicoes</code> na aba Vídeos. Cole a URL do YouTube, Vimeo
            ou Instagram (post/reel/IGTV).
          </p>
        </div>
        <VideoCreateModal
          editions={(editions as any[]) ?? []}
          defaultEditionId={editionFilter && editionFilter !== 0 ? editionFilter : null}
        />
      </div>

      {searchParams.created && (
        <Banner color="success">
          <CheckCircle2 size={14} className="inline mr-1" />
          Vídeo cadastrado.
        </Banner>
      )}
      {searchParams.error && <Banner color="error">{searchParams.error}</Banner>}

      <div
        className="rounded-2xl bg-white p-4 mb-5 flex items-center gap-3 flex-wrap"
        style={{ border: '1px solid var(--line)' }}
      >
        <Filter size={14} style={{ color: 'var(--ink-50)' }} />
        <span
          className="mono text-[10px] tracking-[0.14em]"
          style={{ color: 'var(--ink-50)' }}
        >
          FILTRAR POR EDIÇÃO
        </span>
        <FilterPill
          label="Todas"
          href="/admin/videos"
          active={editionFilter === null}
        />
        <FilterPill
          label="Sem edição"
          href="/admin/videos?edicao=0"
          active={editionFilter === 0}
        />
        {((editions as any[]) ?? []).map((e) => (
          <FilterPill
            key={e.id}
            label={`${e.year}`}
            href={`/admin/videos?edicao=${e.id}`}
            active={editionFilter === e.id}
          />
        ))}
      </div>

      <div
        className="rounded-[20px] bg-white p-7"
        style={{ border: '1px solid var(--line)' }}
      >
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="min-w-0">
            <div
              className="mono text-[10px] tracking-[0.14em]"
              style={{ color: 'var(--ink-50)' }}
            >
              {videos.length} VÍDEO(S)
            </div>
            <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
              {editionFilter === 0
                ? 'Sem edição'
                : editionFilter
                  ? `Edição ${(editions as any[])?.find((e) => e.id === editionFilter)?.year ?? ''}`
                  : 'Todos os vídeos'}
            </h2>
          </div>
        </div>

        {videos.length === 0 && (
          <div
            className="text-center py-16"
            style={{ color: 'var(--ink-50)' }}
          >
            <Video size={28} className="mx-auto mb-3" />
            <div className="mono text-[11px] tracking-[0.14em]">
              NENHUM VÍDEO {editionFilter !== null ? 'NESTE FILTRO' : 'CADASTRADO'}
            </div>
          </div>
        )}

        {videos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((v: any) => (
              <VideoEditCard
                key={v.id}
                video={v}
                editions={(editions as any[]) ?? []}
              />
            ))}
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={count ?? 0}
          buildUrl={(p) => {
            const params = new URLSearchParams()
            if (searchParams.edicao) params.set('edicao', searchParams.edicao)
            if (p > 1) params.set('pagina', String(p))
            return params.toString() ? `?${params.toString()}` : '?'
          }}
        />
      </div>
    </div>
  )
}

function FilterPill({
  label,
  href,
  active,
}: {
  label: string
  href: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className="mono text-[10px] tracking-[0.1em] px-3 py-1.5 rounded-full transition-colors"
      style={{
        background: active ? 'var(--azul)' : 'white',
        color: active ? 'white' : 'var(--ink-70)',
        border: '1px solid ' + (active ? 'var(--azul)' : 'var(--line)'),
      }}
    >
      {label}
    </Link>
  )
}

function Banner({
  color,
  children,
}: {
  color: 'success' | 'error'
  children: React.ReactNode
}) {
  const styles =
    color === 'success'
      ? { bg: 'rgba(166,206,58,0.10)', border: '1px solid rgba(166,206,58,0.4)', color: '#3d5a0a' }
      : { bg: '#fff1f2', border: '1px solid #fecdd3', color: '#b91c1c' }
  return (
    <div
      className="mb-5 p-3 rounded-xl text-sm"
      style={{ background: styles.bg, border: styles.border, color: styles.color }}
    >
      {children}
    </div>
  )
}
