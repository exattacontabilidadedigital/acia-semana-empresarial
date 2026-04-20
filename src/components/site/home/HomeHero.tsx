'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { EDITION_CONFIG } from '@/lib/edition-config'

const TARGET = new Date(EDITION_CONFIG.startDateTime).getTime()

function useCountdown() {
  const [count, setCount] = useState({ d: 0, h: 0, m: 0, s: 0 })

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, TARGET - Date.now())
      setCount({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return count
}

function HeroArt() {
  const count = useCountdown()
  return (
    <div className="relative w-full" style={{ aspectRatio: '4/5' }}>
      <div
        className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-2 rounded-[20px] overflow-hidden"
      >
        <div className="relative overflow-hidden" style={{ background: 'var(--laranja)' }}>
          <div className="absolute bottom-4 left-4 text-white">
            <div className="mono text-[10px] opacity-70 tracking-[0.1em]">01</div>
            <div className="display text-[22px] mt-1.5 tracking-[-0.02em]">Feira</div>
          </div>
          <svg
            className="absolute -right-5 -top-5 opacity-25"
            width="140"
            height="140"
            viewBox="0 0 140 140"
          >
            <circle cx="70" cy="70" r="68" stroke="white" strokeWidth="1" fill="none" />
            <circle cx="70" cy="70" r="40" stroke="white" strokeWidth="1" fill="none" />
          </svg>
        </div>
        <div className="relative" style={{ background: 'var(--verde)' }}>
          <div className="absolute top-4 left-4">
            <div className="mono text-[10px] tracking-[0.1em]" style={{ color: '#2e4a00' }}>
              02
            </div>
            <div
              className="display text-[22px] mt-1.5 tracking-[-0.02em]"
              style={{ color: '#1a3300' }}
            >
              Rodadas
            </div>
          </div>
          <div
            className="absolute bottom-4 right-4 grid gap-1"
            style={{ gridTemplateColumns: 'repeat(4, 6px)' }}
          >
            {Array.from({ length: 16 }).map((_, i) => (
              <span
                key={i}
                className="block w-1.5 h-1.5 rounded-full"
                style={{ background: '#2e4a00', opacity: 0.2 + i / 20 }}
              />
            ))}
          </div>
        </div>
        <div className="relative" style={{ background: 'var(--ciano)' }}>
          <div className="absolute bottom-4 left-4">
            <div className="mono text-[10px] tracking-[0.1em]" style={{ color: '#0a4650' }}>
              03
            </div>
            <div
              className="display text-[22px] mt-1.5 tracking-[-0.02em]"
              style={{ color: '#062e36' }}
            >
              Crédito
            </div>
          </div>
          <div
            className="absolute top-4 right-4 w-12 h-12 rounded"
            style={{ border: '2px solid #062e36', transform: 'rotate(12deg)' }}
          />
        </div>
        <div className="relative" style={{ background: 'var(--azul)' }}>
          <div className="absolute bottom-4 right-4 text-right text-white">
            <div className="mono text-[10px] opacity-70 tracking-[0.1em]">04</div>
            <div className="display text-[22px] mt-1.5 tracking-[-0.02em]">Palestras</div>
          </div>
          <div className="absolute top-4 left-4 flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block"
                style={{ width: 4, height: 28 + i * 4, background: 'rgba(255,255,255,.7)' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Countdown card */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl px-6 py-5"
        style={{
          minWidth: 280,
          boxShadow: '0 30px 60px -20px rgba(20,20,60,0.25)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="mono text-[10px] text-ink-50 tracking-[0.1em]">CONTAGEM REGRESSIVA</div>
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: 'var(--verde)', boxShadow: '0 0 0 4px rgba(166,206,58,.25)' }}
          />
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { l: 'DIAS', v: count.d },
            { l: 'HRS', v: count.h },
            { l: 'MIN', v: count.m },
            { l: 'SEG', v: count.s },
          ].map((u) => (
            <div key={u.l}>
              <div className="display text-[28px] tracking-[-0.02em]">
                {String(u.v).padStart(2, '0')}
              </div>
              <div className="mono text-[9px] text-ink-50 tracking-[0.1em] mt-0.5">{u.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const INSTAGRAM_URL = 'https://www.instagram.com/p/DXP-djWjkqR/'
const INSTAGRAM_EMBED = `${INSTAGRAM_URL}embed/captioned/`

function VideoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  const node = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(10,12,24,.88)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full relative"
        style={{ maxWidth: 480 }}
      >
        <div className="absolute -top-12 right-0 left-0 flex items-center justify-between text-white text-sm">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 opacity-80 hover:opacity-100"
          >
            <ExternalLink size={14} />
            Abrir no Instagram
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex items-center gap-2"
          >
            Fechar
            <span className="w-7 h-7 rounded-full grid place-items-center text-sm border border-white/40">
              ×
            </span>
          </button>
        </div>
        <div
          className="bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: '0 40px 80px rgba(0,0,0,.5)' }}
        >
          <iframe
            src={INSTAGRAM_EMBED}
            title="Vídeo institucional"
            className="w-full border-0 block"
            style={{ height: 'min(80vh, 720px)' }}
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}

export default function HomeHero() {
  const [showVideo, setShowVideo] = useState(false)
  return (
    <section className="overflow-hidden" style={{ paddingTop: 48, paddingBottom: 56 }}>
      <div className="container-site relative">
        <div
          className="grid items-center gap-16 lg:gap-16 grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]"
        >
          <div>
            <div className="eyebrow mb-6">
              <span className="dot" />
              6ª EDIÇÃO · 17 — 22 DE AGOSTO · 2026
            </div>
            <h1
              className="display mb-7"
              style={{ fontSize: 80 }}
            >
              Gente que pensa
              <br />
              <span style={{ color: 'var(--laranja)' }}>negócios</span>
              <br />
              que evoluem.
            </h1>
            <p
              className="mb-9"
              style={{
                fontSize: 18,
                lineHeight: 1.55,
                color: 'var(--ink-70)',
                maxWidth: 520,
              }}
            >
              Seis dias conectando empresários, compradores e fornecedores em um só lugar —
              ampliando networking, gerando negócios e fortalecendo a economia.
            </p>
            <div className="flex gap-3 flex-wrap items-center">
              <Link href="/inscricoes" className="btn btn-orange btn-lg">
                Garantir ingresso <ArrowRight size={16} />
              </Link>
              <Link href="/expositores" className="btn btn-ghost btn-lg">
                Quero ser expositor
              </Link>
              <button
                type="button"
                onClick={() => setShowVideo(true)}
                aria-label="Assistir vídeo institucional"
                className="video-btn flex items-center gap-3 px-1 py-2 text-ink"
              >
                <span
                  className="video-btn-circle relative w-12 h-12 rounded-full grid place-items-center flex-shrink-0"
                  style={{ background: 'var(--verde)' }}
                >
                  <span
                    className="video-btn-pulse absolute inset-0 rounded-full"
                    style={{ border: '2px solid var(--verde)', opacity: 0.5 }}
                  />
                  <span
                    className="video-btn-pulse video-btn-pulse-2 absolute inset-0 rounded-full"
                    style={{ border: '2px solid var(--verde)', opacity: 0.5 }}
                  />
                  <svg
                    width="14"
                    height="16"
                    viewBox="0 0 14 16"
                    fill="#1a3300"
                    style={{ marginLeft: 2, position: 'relative', zIndex: 1 }}
                  >
                    <path d="M0 0L14 8L0 16V0Z" />
                  </svg>
                </span>
                <span className="text-left">
                  <span className="block text-sm font-semibold">Vídeo institucional</span>
                  <span className="block text-xs text-ink-50">Assistir agora</span>
                </span>
              </button>
            </div>

            {/* Quick facts */}
            <div
              className="grid grid-cols-3 mt-14"
              style={{ borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}
            >
              <div style={{ padding: '18px 0', borderRight: '1px solid var(--line)' }}>
                <div className="mono text-[10px] text-ink-50 tracking-[0.1em]">LOCAL</div>
                <div className="font-semibold text-sm mt-1">Açailândia — MA</div>
              </div>
              <div
                style={{ padding: '18px 0 18px 18px', borderRight: '1px solid var(--line)' }}
              >
                <div className="mono text-[10px] text-ink-50 tracking-[0.1em]">ENTRADA</div>
                <div className="font-semibold text-sm mt-1">Gratuita</div>
              </div>
              <div style={{ padding: '18px 0 18px 18px' }}>
                <div className="mono text-[10px] text-ink-50 tracking-[0.1em]">EDIÇÃO</div>
                <div className="font-semibold text-sm mt-1">6ª · 2026</div>
              </div>
            </div>
          </div>

          <HeroArt />
        </div>
      </div>
      <VideoModal open={showVideo} onClose={() => setShowVideo(false)} />
    </section>
  )
}
