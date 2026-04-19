import Link from 'next/link'
import { ImageIcon, Filter, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import PhotoUploadModal from '@/components/admin/PhotoUploadModal'
import PhotoEditCard from '@/components/admin/PhotoEditCard'

export const dynamic = 'force-dynamic'

export default async function AdminGaleriaPage({
  searchParams,
}: {
  searchParams: {
    edicao?: string
    error?: string
    uploaded?: string
    upload_errors?: string
  }
}) {
  const supabase = createServerSupabaseClient()

  const editionFilter = searchParams.edicao ? Number(searchParams.edicao) : null

  const [{ data: editions }, photosResp] = await Promise.all([
    supabase
      .from('editions')
      .select('id, year, title')
      .order('year', { ascending: false }),
    (() => {
      let q = supabase
        .from('gallery_photos')
        .select(
          'id, url, caption, alt, edition_id, size_hint, order_index, featured, created_at'
        )
        .order('order_index', { ascending: true })
        .order('id', { ascending: false })
      if (editionFilter === 0) q = q.is('edition_id', null)
      else if (editionFilter) q = q.eq('edition_id', editionFilter)
      return q
    })(),
  ])

  const photos = photosResp.data ?? []

  return (
    <div className="page-enter">
      <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="eyebrow mb-4">
            <span className="dot" />
            CONTEÚDO · GALERIA
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
            Galeria de fotos
          </h1>
          <p
            className="mt-3"
            style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
          >
            Gerencie as imagens que aparecem em <code>/edicoes</code> agrupadas
            por edição.
          </p>
        </div>
        <PhotoUploadModal
          editions={(editions as any[]) ?? []}
          defaultEditionId={editionFilter && editionFilter !== 0 ? editionFilter : null}
        />
      </div>

      {/* Banners */}
      {searchParams.uploaded && Number(searchParams.uploaded) > 0 && (
        <Banner color="success">
          <CheckCircle2 size={14} className="inline mr-1" />
          {searchParams.uploaded} foto(s) enviada(s) com sucesso.
          {searchParams.upload_errors &&
            ` (${searchParams.upload_errors} falha(s) — verifique formato/tamanho)`}
        </Banner>
      )}
      {searchParams.error && (
        <Banner color="error">{searchParams.error}</Banner>
      )}

      {/* Filtro de edição */}
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
          href="/admin/galeria"
          active={editionFilter === null}
        />
        <FilterPill
          label="Sem edição"
          href="/admin/galeria?edicao=0"
          active={editionFilter === 0}
        />
        {((editions as any[]) ?? []).map((e) => (
          <FilterPill
            key={e.id}
            label={`${e.year}`}
            href={`/admin/galeria?edicao=${e.id}`}
            active={editionFilter === e.id}
          />
        ))}
      </div>

      {/* Grid de fotos */}
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
              {photos.length} FOTO(S)
            </div>
            <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
              {editionFilter === 0
                ? 'Sem edição'
                : editionFilter
                  ? `Edição ${(editions as any[])?.find((e) => e.id === editionFilter)?.year ?? ''}`
                  : 'Todas as fotos'}
            </h2>
          </div>
        </div>

        {photos.length === 0 && (
          <div
            className="text-center py-16"
            style={{ color: 'var(--ink-50)' }}
          >
            <ImageIcon size={28} className="mx-auto mb-3" />
            <div className="mono text-[11px] tracking-[0.14em]">
              NENHUMA FOTO {editionFilter !== null ? 'NESTE FILTRO' : 'CADASTRADA'}
            </div>
          </div>
        )}

        {photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((p: any) => (
              <PhotoEditCard
                key={p.id}
                photo={p}
                editions={(editions as any[]) ?? []}
              />
            ))}
          </div>
        )}
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
