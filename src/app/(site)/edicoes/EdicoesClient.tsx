'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, ArrowUpRight, Download, Play } from 'lucide-react'
import { parseVideoUrl } from '@/lib/video-url'
import ModalPortal from '@/components/ui/ModalPortal'

export type Edition = {
  year: number
  n: string
  t: string
  d: string
  stats: [string, string][]
  c: string
  cover_url?: string | null
  press_kit_url?: string | null
}

export type Photo = {
  id: number
  cap: string
  ed: string
  c: string
  span?: '2x2' | '2x1' | '1x2'
  url?: string | null
  alt?: string | null
}

export type Video = {
  id: string
  cap: string
  ed: string
  dur: string
  c: string
  feat?: boolean
  url?: string | null
  thumb?: string | null
}

export default function EdicoesClient({
  editions,
  photos,
  videos,
}: {
  editions: Edition[]
  photos: Photo[]
  videos: Video[]
}) {
  const safeEditions = editions.length > 0 ? editions : []
  const [active, setActive] = useState(Math.max(0, safeEditions.length - 1))
  const ed = safeEditions[active]

  const [mediaTab, setMediaTab] = useState<'fotos' | 'videos'>('fotos')
  const [mediaEd, setMediaEd] = useState('todas')
  const [lightbox, setLightbox] = useState<Photo | Video | null>(null)

  // Trava o scroll da página enquanto o lightbox está aberto e fecha no Esc
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [lightbox])

  const filteredPhotos = photos.filter((x) => mediaEd === 'todas' || x.ed === mediaEd)
  const filteredVideos = videos.filter((x) => mediaEd === 'todas' || x.ed === mediaEd)

  // Builds dynamic editions list for filters
  const mediaEditions = ['todas', ...safeEditions.map((e) => String(e.year)).reverse()]

  // Calcula max dinamicamente do maior número de participantes
  const max = Math.max(
    ...safeEditions.map((e) => {
      const v = parseInt((e.stats[0]?.[0] ?? '0').replace(/\D/g, ''))
      return isNaN(v) ? 0 : v
    }),
    1
  )

  if (!ed) {
    return (
      <div className="page-enter">
        <section style={{ padding: '64px 0 40px' }}>
          <div className="container-site">
            <div className="eyebrow mb-6">
              <span className="dot" />
              EDIÇÕES ANTERIORES
            </div>
            <h1
              className="display mb-6"
              style={{ fontSize: 80, maxWidth: 1100 }}
            >
              Em breve.
            </h1>
            <p
              className="text-lg leading-relaxed"
              style={{ color: 'var(--ink-70)', maxWidth: 700 }}
            >
              Estamos preparando o histórico das edições anteriores. Volte em
              breve.
            </p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-enter">
      <section style={{ padding: '64px 0 40px' }}>
        <div className="container-site">
          <div className="eyebrow mb-6">
            <span className="dot" />
            EDIÇÕES ANTERIORES
          </div>
          <h1 className="display mb-6" style={{ fontSize: 80, maxWidth: 1100 }}>
            Seis anos construindo a{' '}
            <span style={{ color: 'var(--verde)' }}>economia</span> da região.
          </h1>
          <p
            className="text-lg leading-relaxed"
            style={{ color: 'var(--ink-70)', maxWidth: 700 }}
          >
            Cada edição é um salto. Veja como a Semana Empresarial cresceu de um
            encontro local para o principal evento de negócios do sudoeste
            maranhense.
          </p>
        </div>
      </section>

      <section style={{ padding: '32px 0 96px' }}>
        <div className="container-site">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-12">
            {safeEditions.map((e, i) => {
              const isActive = active === i
              const greenOrCiano =
                e.c === 'var(--verde)' || e.c === 'var(--ciano)'
              return (
                <button
                  key={e.year}
                  onClick={() => setActive(i)}
                  className="text-left rounded-[10px] transition-all"
                  style={{
                    padding: '20px 16px',
                    background: isActive ? e.c : 'white',
                    color: isActive
                      ? greenOrCiano
                        ? '#062e36'
                        : 'white'
                      : 'var(--ink)',
                    border: isActive ? 'none' : '1px solid var(--line)',
                  }}
                >
                  <div className="mono text-[10px] opacity-70 tracking-[0.1em]">
                    {e.n} EDIÇÃO
                  </div>
                  <div
                    className="display mt-1.5"
                    style={{ fontSize: 28, letterSpacing: '-.02em' }}
                  >
                    {e.year}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-12">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <span
                  className="w-2.5 h-2.5 rounded-full block"
                  style={{ background: ed.c }}
                />
                <span className="mono text-xs text-ink-50 tracking-[0.1em]">
                  {ed.n} EDIÇÃO · {ed.year}
                </span>
              </div>
              <h2
                className="display mb-6"
                style={{ fontSize: 'clamp(40px, 5vw, 72px)' }}
              >
                {ed.t}
              </h2>
              <p
                className="mb-8"
                style={{ fontSize: 18, color: 'var(--ink-70)', lineHeight: 1.6 }}
              >
                {ed.d}
              </p>
              {ed.stats.length > 0 && (
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(ed.stats.length, 3)}, 1fr)`,
                    borderTop: '1px solid var(--line)',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  {ed.stats.slice(0, 3).map((s, i) => (
                    <div
                      key={i}
                      className="py-5"
                      style={{
                        borderRight:
                          i < Math.min(ed.stats.length, 3) - 1
                            ? '1px solid var(--line)'
                            : 'none',
                        paddingLeft: i > 0 ? 20 : 0,
                      }}
                    >
                      <div
                        className="display"
                        style={{ fontSize: 32, letterSpacing: '-.02em' }}
                      >
                        {s[0]}
                      </div>
                      <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mt-1.5">
                        {s[1].toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-8 flex gap-3 flex-wrap">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setMediaEd(String(ed.year))
                    document
                      .getElementById('galeria-section')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  Ver galeria {ed.year} <ArrowRight size={14} />
                </button>
                {ed.press_kit_url ? (
                  <a
                    href={ed.press_kit_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                  >
                    <Download size={14} /> Relatório {ed.year}
                  </a>
                ) : (
                  <button
                    className="btn btn-ghost"
                    disabled
                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                    title="Relatório em breve"
                  >
                    <Download size={14} /> Relatório {ed.year}
                  </button>
                )}
              </div>
            </div>
            <div>
              <div
                className="ph rounded-2xl overflow-hidden"
                style={{
                  height: 420,
                  background: ed.cover_url ? 'transparent' : undefined,
                }}
                aria-hidden={!ed.cover_url}
              >
                {ed.cover_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={ed.cover_url}
                    alt={ed.t}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span>FOTO · {ed.n} EDIÇÃO</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '0 0 96px' }}>
        <div className="container-site">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <h2 className="display" style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}>
              Evolução em gráfico
            </h2>
            <span
              className="mono text-xs"
              style={{ color: 'var(--ink-50)' }}
            >
              PARTICIPANTES · {safeEditions[0]?.year}—
              {safeEditions[safeEditions.length - 1]?.year}
            </span>
          </div>
          <div
            className="bg-white border border-line rounded-2xl relative"
            style={{ padding: 40 }}
          >
            <div
              className="flex items-end justify-between gap-4"
              style={{ height: 320 }}
            >
              {safeEditions.map((e, i) => {
                const valStr = e.stats[0]?.[0] ?? '0'
                const val = parseInt(valStr.replace(/\D/g, '')) || 0
                // Calcula altura da barra em px (ao invés de %, que não funciona
                // sem altura explícita no pai). Reserva 50px pra rótulos.
                const BAR_MAX = 240
                const h =
                  val > 0 ? Math.max((val / max) * BAR_MAX, 6) : 0
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActive(i)}
                    className="flex-1 flex flex-col items-center justify-end gap-2 h-full bg-transparent border-none cursor-pointer p-0"
                    title={`${e.year} · ${e.t}`}
                  >
                    <div
                      className="text-xs font-semibold transition-colors"
                      style={{
                        color: active === i ? 'var(--ink)' : 'var(--ink-50)',
                        minHeight: 16,
                      }}
                    >
                      {val > 0 ? valStr : '—'}
                    </div>
                    <div
                      className="w-4/5 transition-all"
                      style={{
                        height: h,
                        background: active === i ? e.c : 'var(--verde)',
                        borderRadius: '6px 6px 0 0',
                      }}
                    />
                    <div
                      className="mono text-[11px] transition-colors"
                      style={{
                        color: active === i ? 'var(--ink)' : 'var(--ink-50)',
                        fontWeight: active === i ? 600 : 400,
                      }}
                    >
                      {e.year}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="galeria-section" style={{ padding: '0 0 32px' }}>
        <div className="container-site">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <div className="eyebrow mb-4">
                <span className="dot" />
                GALERIA
              </div>
              <h2 className="display" style={{ fontSize: 'clamp(40px, 5vw, 58px)' }}>
                O evento <span style={{ color: 'var(--laranja)' }}>em imagens</span>.
              </h2>
            </div>
          </div>

          <div
            className="flex justify-between items-center flex-wrap gap-4 pt-6"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <div
              className="flex gap-1 p-1 rounded-full"
              style={{ background: 'var(--paper-2)' }}
            >
              {(['fotos', 'videos'] as const).map((t) => {
                const isActive = mediaTab === t
                return (
                  <button
                    key={t}
                    onClick={() => setMediaTab(t)}
                    className="rounded-full text-sm font-medium capitalize"
                    style={{
                      padding: '10px 22px',
                      background: isActive ? 'var(--ink)' : 'transparent',
                      color: isActive ? 'white' : 'var(--ink-70)',
                    }}
                  >
                    {t === 'videos' ? 'Vídeos' : 'Fotos'} (
                    {t === 'fotos' ? photos.length : videos.length})
                  </button>
                )
              })}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {mediaEditions.map((e) => {
                const isActive = mediaEd === e
                return (
                  <button
                    key={e}
                    onClick={() => setMediaEd(e)}
                    className="rounded-full text-xs font-medium"
                    style={{
                      padding: '8px 14px',
                      border: isActive ? '1px solid var(--ink)' : '1px solid var(--line)',
                      background: isActive ? 'var(--ink)' : 'white',
                      color: isActive ? 'white' : 'var(--ink-70)',
                      textTransform: e === 'todas' ? 'capitalize' : 'none',
                    }}
                  >
                    {e === 'todas' ? 'Todas' : e}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '0 0 64px' }}>
        <div className="container-site">
          {mediaTab === 'fotos' ? (
            filteredPhotos.length === 0 ? (
              <div
                className="text-center py-16 mono text-[11px] tracking-[0.14em]"
                style={{ color: 'var(--ink-50)' }}
              >
                {photos.length === 0
                  ? 'GALERIA EM CONSTRUÇÃO'
                  : 'NENHUMA FOTO PARA ESSA EDIÇÃO'}
              </div>
            ) : (
              <div
                className="grid grid-cols-2 lg:grid-cols-4 gap-2"
                style={{ gridAutoRows: '180px' }}
              >
                {filteredPhotos.map((p) => {
                  const span: React.CSSProperties = {}
                  if (p.span === '2x2') {
                    span.gridColumn = 'span 2'
                    span.gridRow = 'span 2'
                  }
                  if (p.span === '2x1') span.gridColumn = 'span 2'
                  if (p.span === '1x2') span.gridRow = 'span 2'
                  return (
                    <button
                      key={p.id}
                      onClick={() => setLightbox(p)}
                      className="rounded-[10px] overflow-hidden relative cursor-pointer transition-transform"
                      style={{ ...span, background: p.c, border: 'none' }}
                    >
                      {p.url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={p.url}
                          alt={p.alt ?? p.cap}
                          className="absolute inset-0 object-cover w-full h-full"
                        />
                      ) : (
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              'repeating-linear-gradient(135deg, transparent 0 14px, rgba(255,255,255,.06) 14px 15px)',
                          }}
                        />
                      )}
                      {/* Gradiente pra legibilidade do texto */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            'linear-gradient(180deg, rgba(0,0,0,.35) 0%, transparent 35%, transparent 60%, rgba(0,0,0,.55) 100%)',
                        }}
                      />
                      <div className="absolute top-3 left-3">
                        <div
                          className="mono text-[10px] tracking-[0.1em]"
                          style={{ color: 'rgba(255,255,255,.85)' }}
                        >
                          {p.ed} · #{String(p.id).padStart(3, '0')}
                        </div>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 text-white text-left">
                        <div
                          className="text-[13px] font-semibold"
                          style={{ letterSpacing: '-.005em' }}
                        >
                          {p.cap}
                        </div>
                      </div>
                      <div
                        className="absolute top-3 right-3 w-7 h-7 rounded-full grid place-items-center text-white"
                        style={{ background: 'rgba(255,255,255,.15)' }}
                      >
                        <ArrowUpRight size={14} />
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          ) : filteredVideos.length === 0 ? (
            <div
              className="text-center py-16 mono text-[11px] tracking-[0.14em]"
              style={{ color: 'var(--ink-50)' }}
            >
              {videos.length === 0
                ? 'GALERIA DE VÍDEOS EM CONSTRUÇÃO'
                : 'NENHUM VÍDEO PARA ESSA EDIÇÃO'}
            </div>
          ) : (
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: filteredVideos[0]?.feat
                  ? '2fr 1fr 1fr'
                  : 'repeat(3, 1fr)',
              }}
            >
              {filteredVideos.map((v) => (
                <VideoCard key={v.id} v={v} onOpen={() => setLightbox(v)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {lightbox && (() => {
        const isVideo = mediaTab === 'videos'
        const videoParsed = isVideo
          ? parseVideoUrl((lightbox as Video).url)
          : null
        const videoUrl = isVideo ? (lightbox as Video).url : null
        const isInstagram = videoParsed?.platform === 'instagram'
        return (
          <ModalPortal>
          <div
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
            style={{
              background: 'rgba(10,10,30,.85)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative overflow-hidden rounded-2xl"
              style={{
                // Largura = menor entre (90vw, max teórico, altura × proporção).
                // Como aspectRatio ignora max-height, calculamos a largura usando
                // a altura disponível (90vh) pra garantir que cabe na viewport.
                width: isInstagram
                  ? `min(90vw, 480px, calc(90vh * 9/16))`
                  : isVideo
                    ? `min(95vw, 1100px, calc(90vh * 16/9))`
                    : `min(95vw, 1100px, calc(90vh * 16/10))`,
                aspectRatio: isInstagram
                  ? '9/16'
                  : isVideo
                    ? '16/9'
                    : '16/10',
                background: lightbox.c,
              }}
            >
              {!isVideo && 'url' in lightbox && lightbox.url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={lightbox.url}
                  alt={'alt' in lightbox ? lightbox.alt ?? lightbox.cap : lightbox.cap}
                  className="absolute inset-0 object-contain w-full h-full"
                  style={{ background: 'rgba(0,0,0,.85)' }}
                />
              )}
              {isVideo && videoParsed?.embedUrl && (
                <iframe
                  src={videoParsed.embedUrl}
                  title={lightbox.cap}
                  className="absolute inset-0 w-full h-full"
                  style={{ border: 'none', background: 'black' }}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              )}
              {isVideo && !videoParsed?.embedUrl && videoUrl && (
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  className="absolute inset-0 w-full h-full"
                  style={{ background: 'black' }}
                />
              )}
              {isVideo && !videoUrl && (
                <div className="absolute inset-0 grid place-items-center text-white">
                  <div className="text-center">
                    <div
                      className="w-[100px] h-[100px] rounded-full grid place-items-center mx-auto mb-4"
                      style={{
                        background: 'rgba(255,255,255,.95)',
                        color: lightbox.c,
                      }}
                    >
                      <Play size={40} fill="currentColor" stroke="none" />
                    </div>
                    <p className="mono text-[11px] tracking-[0.1em] opacity-70">
                      VÍDEO INDISPONÍVEL
                    </p>
                  </div>
                </div>
              )}
              {!isVideo && (
                <div
                  className="absolute bottom-6 left-8 text-white"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
                >
                  <div className="mono text-[11px] opacity-80 tracking-[0.1em] mb-1.5">
                    {lightbox.ed}
                    {'dur' in lightbox && lightbox.dur ? ` · ${lightbox.dur}` : ''}
                  </div>
                  <div
                    className="display"
                    style={{ fontSize: 28, letterSpacing: '-.02em' }}
                  >
                    {lightbox.cap}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setLightbox(null)}
              className="fixed top-6 right-6 w-11 h-11 rounded-full text-lg"
              style={{ background: 'white', color: 'var(--ink)', border: 'none' }}
            >
              ✕
            </button>
          </div>
          </ModalPortal>
        )
      })()}

      <section style={{ padding: '0 0 96px' }}>
        <div className="container-site">
          <div
            className="rounded-2xl flex justify-between items-center flex-wrap gap-6"
            style={{ background: 'var(--paper-2)', padding: '48px 40px' }}
          >
            <div>
              <h3 className="display mb-2" style={{ fontSize: 32 }}>
                Material de imprensa
              </h3>
              <p style={{ color: 'var(--ink-70)' }}>
                Fotos em alta, vídeos brutos e kit de comunicação.
              </p>
            </div>
            {ed.press_kit_url ? (
              <a
                href={ed.press_kit_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <Download size={14} /> Baixar press kit
              </a>
            ) : (
              <button
                className="btn btn-primary"
                disabled
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
              >
                <Download size={14} /> Em breve
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function VideoCard({ v, onOpen }: { v: Video; onOpen: () => void }) {
  const parsed = parseVideoUrl(v.url)
  const initialThumb = v.thumb || parsed.thumbnailUrl
  const [thumbBroken, setThumbBroken] = useState(false)
  const showImage = !!initialThumb && !thumbBroken

  return (
    <button
      onClick={onOpen}
      className="rounded-[14px] overflow-hidden relative cursor-pointer text-left"
      style={{
        gridColumn: v.feat ? 'span 3' : 'auto',
        aspectRatio: v.feat ? '21/9' : '4/3',
        background: v.c,
        border: 'none',
      }}
    >
      {showImage ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={initialThumb!}
          alt={v.cap}
          className="absolute inset-0 object-cover w-full h-full"
          onError={() => setThumbBroken(true)}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              'repeating-linear-gradient(135deg, transparent 0 14px, rgba(255,255,255,.08) 14px 15px)',
          }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, transparent 40%, rgba(0,0,0,.5) 100%)',
        }}
      />
      <div className="absolute top-4 left-4">
        <div
          className="mono text-[11px] tracking-[0.1em]"
          style={{ color: 'rgba(255,255,255,.85)' }}
        >
          {v.ed}
        </div>
      </div>
      {v.dur && (
        <div
          className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[11px] mono text-white"
          style={{ background: 'rgba(0,0,0,.45)' }}
        >
          {v.dur}
        </div>
      )}
      <div className="absolute inset-0 grid place-items-center">
        <div
          className="rounded-full grid place-items-center"
          style={{
            width: v.feat ? 84 : 60,
            height: v.feat ? 84 : 60,
            background: 'rgba(255,255,255,.95)',
            color: v.c,
          }}
        >
          <Play size={v.feat ? 30 : 22} fill="currentColor" stroke="none" />
        </div>
      </div>
      <div className="absolute bottom-4 left-4 right-4 text-white">
        <div
          className={v.feat ? 'display' : ''}
          style={{
            fontSize: v.feat ? 22 : 15,
            fontWeight: 600,
            letterSpacing: '-.01em',
          }}
        >
          {v.cap}
        </div>
      </div>
    </button>
  )
}
