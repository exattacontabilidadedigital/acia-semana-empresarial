'use client'

import { useState } from 'react'
import { ArrowRight, Check, Loader2, MapPin, Send } from 'lucide-react'

const SEGMENTS = [
  'Alimentício',
  'Vestuário',
  'Tecnologia',
  'Saúde',
  'Serviços',
  'Indústria',
  'Agronegócio',
  'Educação',
  'Outro',
]

const STAND_SIZES = [
  { value: 'pequeno', label: 'Pequeno (3x3m)' },
  { value: 'medio', label: 'Médio (4x4m)' },
  { value: 'grande', label: 'Grande (6x4m)' },
  { value: 'indefinido', label: 'Ainda não sei' },
]

const PAST_EXHIBITORS = [
  { name: 'Vale', cat: 'Indústria', c: 'var(--verde)' },
  { name: 'Suzano', cat: 'Indústria', c: 'var(--verde)' },
  { name: 'Gerdau', cat: 'Indústria', c: 'var(--laranja)' },
  { name: 'Caixa', cat: 'Financeiro', c: 'var(--laranja)' },
  { name: 'Banco do Brasil', cat: 'Financeiro', c: 'var(--laranja)' },
  { name: 'Sicoob', cat: 'Financeiro', c: 'var(--verde)' },
  { name: 'Sebrae', cat: 'Institucional', c: 'var(--ciano)' },
  { name: 'Fiema', cat: 'Institucional', c: 'var(--laranja)' },
  { name: 'Senai', cat: 'Educação', c: 'var(--laranja)' },
  { name: 'Senac', cat: 'Educação', c: 'var(--laranja)' },
  { name: 'IFMA', cat: 'Educação', c: 'var(--laranja)' },
  { name: 'Light Veículos', cat: 'Automotivo', c: 'var(--ciano)' },
  { name: 'Agro Açailândia', cat: 'Agronegócio', c: 'var(--verde)' },
  { name: 'Tec Norte', cat: 'Tecnologia', c: 'var(--laranja)' },
  { name: 'Constrular', cat: 'Construção', c: 'var(--laranja)' },
  { name: 'Casa & Lar', cat: 'Varejo', c: 'var(--ciano)' },
  { name: 'Sicredi', cat: 'Financeiro', c: 'var(--verde)' },
  { name: 'Banco do Nordeste', cat: 'Financeiro', c: 'var(--laranja)' },
  { name: 'Sesi', cat: 'Institucional', c: 'var(--laranja)' },
  { name: 'CEMAR', cat: 'Energia', c: 'var(--verde)' },
]

const CATEGORIES = ['Todos', 'Indústria', 'Financeiro', 'Institucional', 'Educação', 'Automotivo']

const INFO_BLOCKS = [
  {
    t: 'O que inclui',
    items: [
      'Espaço construído e montado',
      'Energia 220v · iluminação',
      'Identificação frontal',
      '1 mesa · 4 cadeiras',
      'Wi-fi · limpeza',
      '4 credenciais expositor',
    ],
    c: 'var(--laranja)',
  },
  {
    t: 'Como reservar',
    items: [
      '1. Preencha o cadastro',
      '2. Aguarde análise da equipe',
      '3. Receba contato comercial',
      '4. Pagamento em até 5x',
      '5. Receba contrato digital',
      '6. Confirmação em 24h',
    ],
    c: 'var(--laranja)',
  },
  {
    t: 'Prazos',
    items: [
      'Pré-reserva: até 20.07',
      'Pagamento: até 31.07',
      'Montagem: 18 e 19.08',
      'Abertura: 20.08 · 14h',
      'Desmontagem: 23.08',
      'Suporte 24h durante evento',
    ],
    c: 'var(--verde)',
  },
]

function formatCNPJ(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (digits.length >= 7) return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
  if (digits.length >= 3) return digits.replace(/(\d{2})(\d{0,5})/, '($1) $2')
  return digits
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'var(--paper)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
}

export default function ExpositoresPage() {
  const [cat, setCat] = useState('Todos')
  const [form, setForm] = useState({
    company_name: '',
    cnpj: '',
    responsible_name: '',
    responsible_role: '',
    email: '',
    phone: '',
    segment: '',
    description: '',
    stand_size: 'indefinido',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const filtered = PAST_EXHIBITORS.filter((e) => cat === 'Todos' || e.cat === cat)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/exhibitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          phone: form.phone.replace(/\D/g, ''),
          cnpj: form.cnpj.replace(/\D/g, '') || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao enviar cadastro')
        return
      }
      setSuccess(true)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="page-enter">
        <section
          style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: '96px 0' }}
        >
          <div className="container-site" style={{ maxWidth: 640, textAlign: 'center' }}>
            <div
              className="mx-auto mb-8 rounded-full grid place-items-center"
              style={{ width: 80, height: 80, background: 'var(--verde)' }}
            >
              <Check size={40} strokeWidth={2.5} />
            </div>
            <div className="eyebrow mb-4 justify-center">
              <span className="dot" style={{ background: 'var(--verde)' }} />
              CADASTRO ENVIADO
            </div>
            <h1
              className="display mb-5"
              style={{ fontSize: 'clamp(40px, 5vw, 64px)' }}
            >
              Recebemos seu interesse!
            </h1>
            <p
              className="mb-8"
              style={{ fontSize: 17, color: 'var(--ink-70)', lineHeight: 1.6 }}
            >
              Nossa equipe vai analisar sua solicitação e entrar em contato pelo email{' '}
              <strong>{form.email}</strong>.
            </p>
            <a href="/" className="btn btn-primary">
              Voltar para o início <ArrowRight size={14} />
            </a>
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
            EXPOSITORES
          </div>
          <h1
            className="display mb-8"
            style={{ fontSize: 'clamp(48px, 8vw, 120px)', maxWidth: 1100 }}
          >
            Seu stand na maior <span style={{ color: 'var(--verde)' }}>feira</span> do sudoeste
            maranhense.
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: 'var(--ink-70)', maxWidth: 700 }}>
            Mais de 80 expositores em 6.000 m² de feira. Cadastre-se para receber a proposta
            comercial com cotas, mapa de stands e prazos.
          </p>
        </div>
      </section>

      {/* Quem já expôs */}
      <section style={{ padding: '0 0 64px' }}>
        <div className="container-site">
          <div className="flex justify-between items-end flex-wrap gap-4 mb-8">
            <div>
              <div className="eyebrow mb-4">
                <span className="dot" />
                QUEM JÁ EXPÔS
              </div>
              <h2 className="display" style={{ fontSize: 'clamp(28px, 3.5vw, 44px)' }}>
                +80 marcas nas últimas edições
              </h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => {
                const isActive = cat === c
                return (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
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
                    {c}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {filtered.map((e, i) => (
              <div
                key={i}
                className="bg-white border border-line rounded-[10px] flex flex-col gap-3.5"
                style={{ padding: '24px 18px', minHeight: 140 }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2 h-2 rounded-full block"
                    style={{ background: e.c }}
                  />
                  <span className="mono text-[10px] text-ink-50 tracking-[0.1em]">
                    {e.cat.toUpperCase()}
                  </span>
                </div>
                <div
                  className="display mt-auto"
                  style={{ fontSize: 22, letterSpacing: '-.02em' }}
                >
                  {e.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mapa de stands - placeholder */}
      <section style={{ background: 'var(--paper-2)', padding: '80px 0' }}>
        <div className="container-site">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <div className="eyebrow mb-4">
                <span className="dot" />
                MAPA DE STANDS · 2026
              </div>
              <h2 className="display" style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}>
                Escolha sua posição.
              </h2>
            </div>
          </div>

          <div
            className="ph rounded-2xl flex items-center justify-center text-center"
            style={{ minHeight: 320, padding: 32 }}
          >
            <div>
              <MapPin size={40} className="mx-auto mb-3 opacity-50" />
              <div className="display mb-2" style={{ fontSize: 22 }}>
                Mapa interativo em breve
              </div>
              <p className="text-sm max-w-md mx-auto">
                Cadastre-se abaixo para receber o mapa de stands, valores e disponibilidade da 6ª
                edição.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Form */}
      <section id="cadastro" style={{ padding: '96px 0' }}>
        <div className="container-site">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-16">
            <div>
              <div className="eyebrow mb-5">
                <span className="dot" />
                QUERO SER EXPOSITOR
              </div>
              <h2
                className="display mb-6"
                style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}
              >
                Vamos preparar a sua{' '}
                <span style={{ color: 'var(--laranja)' }}>proposta.</span>
              </h2>
              <p
                className="mb-8"
                style={{ fontSize: 16, color: 'var(--ink-70)', lineHeight: 1.6 }}
              >
                Preencha os dados da sua empresa. Nossa equipe comercial retorna com mapa, cotas e
                cronograma específico para o seu segmento.
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
              onSubmit={handleSubmit}
              className="bg-white border border-line rounded-2xl"
              style={{ padding: 40 }}
            >
              {error && (
                <div
                  className="mb-5 p-4 rounded-lg text-sm"
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                  }}
                >
                  {error}
                </div>
              )}

              <div className="mono text-[11px] text-ink-50 tracking-[0.1em] mb-4">
                DADOS DA EMPRESA
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <label className="block sm:col-span-2">
                  <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2">
                    NOME DA EMPRESA *
                  </div>
                  <input
                    type="text"
                    name="company_name"
                    value={form.company_name}
                    onChange={handleChange}
                    required
                    placeholder="Razão social ou nome fantasia"
                    style={inputStyle}
                  />
                </label>
                <label className="block">
                  <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2">CNPJ</div>
                  <input
                    type="text"
                    name="cnpj"
                    value={form.cnpj}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, cnpj: formatCNPJ(e.target.value) }))
                    }
                    placeholder="00.000.000/0000-00"
                    style={inputStyle}
                  />
                </label>
                <label className="block">
                  <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2">
                    SEGMENTO *
                  </div>
                  <select
                    name="segment"
                    value={form.segment}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  >
                    <option value="">Selecione...</option>
                    {SEGMENTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mono text-[11px] text-ink-50 tracking-[0.1em] mb-4 mt-7">
                RESPONSÁVEL
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <label className="block">
                  <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2">
                    NOME *
                  </div>
                  <input
                    type="text"
                    name="responsible_name"
                    value={form.responsible_name}
                    onChange={handleChange}
                    required
                    placeholder="Nome completo"
                    style={inputStyle}
                  />
                </label>
                <label className="block">
                  <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2">CARGO</div>
                  <input
                    type="text"
                    name="responsible_role"
                    value={form.responsible_role}
                    onChange={handleChange}
                    placeholder="Diretor, Gerente..."
                    style={inputStyle}
                  />
                </label>
                <label className="block">
                  <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2">
                    E-MAIL *
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="contato@empresa.com"
                    style={inputStyle}
                  />
                </label>
                <label className="block">
                  <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2">
                    TELEFONE / WHATSAPP *
                  </div>
                  <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, phone: formatPhone(e.target.value) }))
                    }
                    required
                    placeholder="(00) 00000-0000"
                    style={inputStyle}
                  />
                </label>
              </div>

              <div className="mono text-[11px] text-ink-50 tracking-[0.1em] mb-4 mt-7">
                SOBRE A EXPOSIÇÃO
              </div>
              <label className="block mb-5">
                <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2">
                  DESCRIÇÃO
                </div>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="O que você pretende expor na feira?"
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </label>

              <div className="mb-7">
                <div className="mono text-[10px] text-ink-50 tracking-[0.1em] mb-2.5">
                  TAMANHO DO ESTANDE
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {STAND_SIZES.map((size) => {
                    const isActive = form.stand_size === size.value
                    return (
                      <button
                        key={size.value}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, stand_size: size.value }))}
                        className="rounded-lg text-sm font-medium"
                        style={{
                          padding: '12px 14px',
                          border: isActive
                            ? '1px solid var(--ink)'
                            : '1px solid var(--line)',
                          background: isActive ? 'var(--ink)' : 'white',
                          color: isActive ? 'white' : 'var(--ink-70)',
                        }}
                      >
                        {size.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-orange btn-lg w-full justify-center disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {loading ? 'Enviando...' : 'Enviar cadastro'}
              </button>

              <p
                className="text-xs text-center mt-4"
                style={{ color: 'var(--ink-50)' }}
              >
                Após o envio, nossa equipe analisa sua solicitação e entra em contato.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* Info blocks */}
      <section style={{ padding: '0 0 96px' }}>
        <div className="container-site">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {INFO_BLOCKS.map((b, i) => (
              <div
                key={i}
                className="bg-white border border-line rounded-2xl"
                style={{ padding: 32 }}
              >
                <div className="flex items-center gap-2.5 mb-5">
                  <span
                    className="w-2 h-2 rounded-full block"
                    style={{ background: b.c }}
                  />
                  <span className="mono text-[11px] text-ink-50 tracking-[0.1em]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3
                  className="display mb-5"
                  style={{ fontSize: 24, letterSpacing: '-.02em' }}
                >
                  {b.t}
                </h3>
                <ul className="flex flex-col gap-2">
                  {b.items.map((it, j) => (
                    <li
                      key={j}
                      className="flex items-start gap-2"
                      style={{ fontSize: 14, color: 'var(--ink-70)' }}
                    >
                      <span style={{ color: b.c, marginTop: 2 }}>
                        <Check size={14} />
                      </span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
