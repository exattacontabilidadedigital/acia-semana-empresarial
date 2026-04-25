'use client'

import { FormEvent, useState, useTransition } from 'react'
import { ArrowRight, Check, Loader2, AlertCircle } from 'lucide-react'
import { submitSponsorshipLeadAction } from './actions'

type Tier = {
  id: string
  n: string
  tagline: string
  c: string
  fg: string
  benefits: string[]
  limit: string
}

const TIERS: Tier[] = [
  {
    id: 'master',
    n: 'Master',
    tagline: 'Patrocínio exclusivo',
    c: 'var(--laranja)',
    fg: 'white',
    benefits: [
      'Naming rights do evento',
      'Logo em todo material',
      'Stand premium 60m²',
      'Palco próprio',
      '10 rodadas de negócios',
      'Palestra institucional',
      'Vídeo institucional em todos os LEDs',
    ],
    limit: '1 cota',
  },
  {
    id: 'diamante',
    n: 'Diamante',
    tagline: 'Máximo destaque',
    c: 'var(--laranja)',
    fg: 'white',
    benefits: [
      'Logo com destaque',
      'Stand 40m² premium',
      '6 rodadas de negócios',
      'Talk institucional',
      'LED principal',
      'Brindes oficiais',
    ],
    limit: '3 cotas',
  },
  {
    id: 'ouro',
    n: 'Ouro',
    tagline: 'Presença estratégica',
    c: 'var(--verde)',
    fg: '#1a3300',
    benefits: [
      'Logo em material principal',
      'Stand 24m²',
      '4 rodadas',
      'Presença em LED',
      'Kit expositor',
    ],
    limit: '6 cotas',
  },
  {
    id: 'prata',
    n: 'Prata',
    tagline: 'Visibilidade garantida',
    c: 'var(--ciano)',
    fg: '#062e36',
    benefits: ['Logo em material', 'Stand 16m²', '2 rodadas', 'Menção institucional'],
    limit: '12 cotas',
  },
  {
    id: 'apoio',
    n: 'Apoio',
    tagline: 'Parceria institucional',
    c: 'white',
    fg: 'var(--ink)',
    benefits: ['Logo na listagem de apoio', 'Acesso credenciado', 'Visibilidade digital'],
    limit: 'Institucional',
  },
]

const SPONSORS_CONFIRMED = [
  {
    id: 'diamante',
    n: 'Diamante',
    c: 'var(--laranja)',
    img: '/site/patrocinadores/diamante.png',
    count: 2,
    h: 110,
  },
  {
    id: 'master',
    n: 'Master',
    c: 'var(--laranja)',
    img: '/site/patrocinadores/master.png',
    count: 3,
    h: 110,
  },
  {
    id: 'ouro',
    n: 'Ouro',
    c: 'var(--verde)',
    img: '/site/patrocinadores/ouro.png',
    count: 8,
    h: 240,
  },
  {
    id: 'prata',
    n: 'Prata',
    c: 'var(--ciano)',
    img: '/site/patrocinadores/prata.png',
    count: 3,
    h: 100,
  },
  {
    id: 'apoio-inst',
    n: 'Apoio Institucional',
    c: 'var(--ink)',
    img: '/site/patrocinadores/apoio-institucional.png',
    count: 1,
    h: 90,
  },
  {
    id: 'apoio',
    n: 'Apoio',
    c: '#999',
    img: '/site/patrocinadores/apoio.png',
    count: 1,
    h: 170,
  },
]

function Field({
  label,
  value,
  onChange,
  type = 'text',
  textarea = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  textarea?: boolean
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    background: 'var(--paper)',
    border: '1px solid var(--line)',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'inherit',
  }
  return (
    <label className="block">
      <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2">
        {label.toUpperCase()}
      </div>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
        />
      )}
    </label>
  )
}

export default function ParceirosPage() {
  const [activeTier, setActiveTier] = useState('master')
  const [form, setForm] = useState({
    nome: '',
    empresa: '',
    email: '',
    cota: 'diamante',
    mensagem: '',
  })
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const tier = TIERS.find((t) => t.id === activeTier)!

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await submitSponsorshipLeadAction({
        nome: form.nome,
        empresa: form.empresa,
        email: form.email,
        cota: form.cota,
        mensagem: form.mensagem,
      })
      if (result.ok) {
        setSent(true)
        setForm({
          nome: '',
          empresa: '',
          email: '',
          cota: 'diamante',
          mensagem: '',
        })
        setTimeout(() => setSent(false), 6000)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className="page-enter">
      <section style={{ padding: '64px 0 40px' }}>
        <div className="container-site">
          <div className="eyebrow mb-6">
            <span className="dot" />
            PARCEIROS & PATROCÍNIO
          </div>
          <h1
            className="display mb-8"
            style={{ fontSize: 80, maxWidth: 1100 }}
          >
            Quem faz a semana <span style={{ color: 'var(--ciano)' }}>acontecer.</span>
          </h1>
          <div
            className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-16 pt-6"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <p className="text-lg leading-relaxed" style={{ color: 'var(--ink-70)' }}>
              Patrocinar a Semana Empresarial é colocar sua marca no centro do calendário de
              negócios do sudoeste maranhense. 7.200 participantes, +1.000 empresas, mídia regional
              em peso e resultado imediato em vendas.
            </p>
            <div className="grid grid-cols-2">
              <div className="py-3" style={{ borderRight: '1px solid var(--line)' }}>
                <div className="display" style={{ fontSize: 40, letterSpacing: '-.02em' }}>
                  688k
                </div>
                <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mt-1">
                  VIEWS · 30 DIAS
                </div>
              </div>
              <div className="py-3 pl-5">
                <div className="display" style={{ fontSize: 40, letterSpacing: '-.02em' }}>
                  16
                </div>
                <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mt-1">
                  COTAS EM 2025
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tier selector */}
      <section style={{ padding: '0 0 96px' }}>
        <div className="container-site">
          <div className="eyebrow mb-5">
            <span className="dot" />
            COTAS DE PATROCÍNIO
          </div>
          <h2 className="display mb-10" style={{ fontSize: 'clamp(32px, 4vw, 56px)' }}>
            Escolha o tamanho da sua presença
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-8">
            {TIERS.map((t) => {
              const isActive = activeTier === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTier(t.id)}
                  className="text-left rounded-[10px] transition-all"
                  style={{
                    padding: '24px 20px',
                    background: isActive ? t.c : 'white',
                    color: isActive ? t.fg : 'var(--ink)',
                    border: isActive ? 'none' : '1px solid var(--line)',
                  }}
                >
                  <div className="mono text-[10px] opacity-70 tracking-[0.1em]">COTA</div>
                  <div
                    className="display mt-1.5"
                    style={{ fontSize: 26, letterSpacing: '-.02em' }}
                  >
                    {t.n}
                  </div>
                  <div className="text-xs mt-2.5 opacity-80">{t.limit}</div>
                </button>
              )
            })}
          </div>

          <div
            className="rounded-[20px] relative overflow-hidden"
            style={{
              background: tier.c,
              color: tier.fg,
              padding: 48,
              border: tier.id === 'apoio' ? '1px solid var(--line)' : 'none',
            }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-12 items-center">
              <div>
                <div className="mono text-[11px] opacity-70 tracking-[0.1em] mb-3">
                  COTA · {tier.tagline.toUpperCase()}
                </div>
                <div
                  className="display mb-5"
                  style={{
                    fontSize: 'clamp(48px, 7vw, 96px)',
                    letterSpacing: '-.03em',
                    lineHeight: 0.95,
                  }}
                >
                  {tier.n}
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-7">
                  <span
                    className="mono text-[11px] tracking-[0.1em] rounded-full"
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(255,255,255,0.22)',
                      color: tier.fg,
                      border: '1px solid rgba(255,255,255,0.3)',
                    }}
                  >
                    {tier.limit.toUpperCase()}
                  </span>
                  <span className="mono text-[11px] tracking-[0.1em] opacity-80">
                    INVESTIMENTO SOB CONSULTA
                  </span>
                </div>
                <button
                  className="btn"
                  style={{
                    background: tier.id === 'apoio' ? 'var(--ink)' : 'white',
                    color: tier.id === 'apoio' ? 'white' : tier.c,
                  }}
                  onClick={() =>
                    document
                      .getElementById('parceiro-form')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                >
                  Quero esta cota <ArrowRight size={14} />
                </button>
              </div>
              <div>
                <div className="mono text-[11px] opacity-70 tracking-[0.1em] mb-4">
                  O QUE INCLUI
                </div>
                <ul className="flex flex-col gap-3">
                  {tier.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[15px]">
                      <span className="mt-0.5 opacity-70">
                        <Check size={16} />
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sponsors confirmed */}
      <section style={{ background: 'var(--paper-2)', padding: '96px 0' }}>
        <div className="container-site">
          <div className="eyebrow mb-5">
            <span className="dot" />
            PATROCINADORES CONFIRMADOS · 2026
          </div>
          <h2
            className="display mb-4"
            style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}
          >
            Marcas que acreditam na <span style={{ color: 'var(--laranja)' }}>semana.</span>
          </h2>
          <p
            className="mb-12"
            style={{
              fontSize: 16,
              color: 'var(--ink-70)',
              lineHeight: 1.6,
              maxWidth: 640,
            }}
          >
            A 6ª edição já conta com a confirmação das marcas abaixo, organizadas por cota de
            patrocínio e apoio.
          </p>

          <div className="flex flex-col gap-7">
            {SPONSORS_CONFIRMED.map((t) => (
              <div
                key={t.id}
                className="bg-white border border-line rounded-2xl"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '220px 1fr',
                  gap: 40,
                  alignItems: 'center',
                  padding: '28px 32px',
                }}
              >
                <div
                  className="flex items-center gap-3.5 pr-5"
                  style={{ borderRight: '1px solid var(--line)' }}
                >
                  <span
                    className="block rounded"
                    style={{ width: 4, height: 44, background: t.c }}
                  />
                  <div>
                    <div className="mono text-[10px] text-ink-50 tracking-[0.12em]">COTA</div>
                    <div
                      className="display mt-0.5"
                      style={{ fontSize: 24, letterSpacing: '-.02em' }}
                    >
                      {t.n}
                    </div>
                    <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mt-1">
                      {t.count} {t.count === 1 ? 'MARCA' : 'MARCAS'}
                    </div>
                  </div>
                </div>
                <div
                  className="flex items-center justify-center"
                  style={{ minHeight: t.h, padding: '8px 0' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.img}
                    alt={`Patrocinadores ${t.n}`}
                    style={{ maxWidth: '100%', maxHeight: t.h, objectFit: 'contain' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section id="parceiro-form" style={{ padding: '96px 0' }}>
        <div className="container-site">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-16">
            <div>
              <div className="eyebrow mb-5">
                <span className="dot" />
                QUERO SER PARCEIRO
              </div>
              <h2
                className="display mb-6"
                style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}
              >
                Vamos conversar sobre a{' '}
                <span style={{ color: 'var(--laranja)' }}>sua cota.</span>
              </h2>
              <p
                className="mb-8"
                style={{ fontSize: 16, color: 'var(--ink-70)', lineHeight: 1.6 }}
              >
                Envie seus dados e a cota de interesse. Nosso time comercial retorna em até 48
                horas com proposta personalizada.
              </p>
              <div className="pt-6" style={{ borderTop: '1px solid var(--line)' }}>
                <div className="mono text-[11px] text-ink-50 tracking-[0.1em] mb-3">
                  OU FALE DIRETO
                </div>
                <div className="text-base font-semibold">acia.aca@gmail.com</div>
                <div className="text-base font-semibold mt-1.5">+55 99 98833-4432</div>
              </div>
            </div>
            <form
              onSubmit={submit}
              className="bg-white border border-line rounded-2xl"
              style={{ padding: 40 }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <Field
                  label="Nome"
                  value={form.nome}
                  onChange={(v) => setForm({ ...form, nome: v })}
                />
                <Field
                  label="Empresa"
                  value={form.empresa}
                  onChange={(v) => setForm({ ...form, empresa: v })}
                />
              </div>
              <div className="mb-5">
                <Field
                  label="E-mail corporativo"
                  type="email"
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                />
              </div>
              <div className="mb-5">
                <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2.5">
                  COTA DE INTERESSE
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TIERS.map((t) => {
                    const isActive = form.cota === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setForm({ ...form, cota: t.id })}
                        className="rounded-full text-xs font-medium"
                        style={{
                          padding: '8px 14px',
                          border: isActive
                            ? '1px solid var(--ink)'
                            : '1px solid var(--line)',
                          background: isActive ? 'var(--ink)' : 'white',
                          color: isActive ? 'white' : 'var(--ink-70)',
                        }}
                      >
                        {t.n}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="mb-6">
                <Field
                  label="Mensagem"
                  textarea
                  value={form.mensagem}
                  onChange={(v) => setForm({ ...form, mensagem: v })}
                />
              </div>
              {error && (
                <div
                  className="mb-4 rounded-lg px-3 py-2 text-sm flex items-start gap-2"
                  style={{
                    background: '#fff1f2',
                    color: '#b91c1c',
                    border: '1px solid #fecdd3',
                  }}
                >
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={pending || sent}
                className="btn btn-orange btn-lg w-full justify-center"
                style={
                  pending || sent
                    ? { opacity: 0.7, pointerEvents: 'none' }
                    : undefined
                }
              >
                {pending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Enviando...
                  </>
                ) : sent ? (
                  <>
                    <Check size={14} /> Recebido! Retornaremos em até 48h
                  </>
                ) : (
                  <>
                    Enviar proposta <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
