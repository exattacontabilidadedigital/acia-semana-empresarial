import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import HomeHero from '@/components/site/home/HomeHero'
import InscricaoQuickCard from '@/components/site/home/InscricaoQuickCard'

const REALIZADORES = [
  {
    n: 'ACIA',
    d: 'Associação Comercial, Industrial e Serviços de Açailândia',
    c: 'var(--laranja)',
    logo: '/site/logo-acia.png',
  },
  {
    n: 'SICA',
    d: 'Sindicato do Comércio Varejista de Açailândia',
    c: 'var(--laranja)',
    logo: '/site/logo-sica.png',
  },
  {
    n: 'CDL',
    d: 'Câmara de Dirigentes Lojistas de Açailândia',
    c: 'var(--verde)',
    logo: '/site/logo-cdl.png',
  },
  {
    n: 'SEBRAE',
    d: 'Serviço Brasileiro de Apoio às Micro e Pequenas Empresas',
    c: 'var(--ciano)',
    logo: '/site/logo-sebrae.png',
  },
]

const PROGRAMA = [
  {
    t: 'Feira de Exposição Multissetorial',
    d: 'Mais de 80 expositores em 6.000 m² dedicados à exposição e negociação direta com compradores e fornecedores.',
    c: 'var(--laranja)',
    day: '20 — 22.08',
  },
  {
    t: 'Palestra Magna',
    d: 'Referência nacional abre oficialmente a semana com um recorte sobre economia regional e desenvolvimento.',
    c: 'var(--laranja)',
    day: '19.08 · 19h',
  },
  {
    t: 'Oficina de Negócios',
    d: 'Capacitações práticas em gestão, marketing digital, finanças e vendas para pequenos e médios negócios.',
    c: 'var(--verde)',
    day: '17 — 22.08',
  },
  {
    t: 'Rodada de Negócios',
    d: 'Encontros estruturados entre compradores e fornecedores. Em 2025, R$ 5,29 mi em negócios imediatos.',
    c: 'var(--laranja)',
    day: '18 — 20.08',
  },
  {
    t: 'Plantão de Consultorias',
    d: 'Consultores atendendo empresários em pautas de gestão, jurídico, contábil e inovação.',
    c: 'var(--ciano)',
    day: '17 — 22.08',
  },
  {
    t: 'Rodada de Crédito',
    d: 'Bancos de fomento presentes com linhas de financiamento específicas e atendimento presencial.',
    c: 'var(--verde)',
    day: '17 — 22.08',
  },
  {
    t: 'Talk Mulheres Empreendedoras',
    d: 'Encontro dedicado à liderança feminina e ao empreendedorismo regional.',
    c: 'var(--ciano)',
    day: '18.08 · 18h',
  },
]

const NUMEROS = [
  { n: '7.200', l: 'Participantes', c: 'var(--verde)' },
  { n: '+1.000', l: 'Empresas', c: 'var(--laranja)' },
  { n: '80', l: 'Expositores', c: 'var(--ciano)' },
  { n: 'R$ 5,29 mi', l: 'Em negócios', c: 'var(--verde)' },
]

const INSCRICOES = [
  { t: 'Feira Multissetorial', d: '20 — 22.08', p: 'Gratuito', c: 'var(--laranja)' },
  { t: 'Palestra Magna', d: '19.08 · 19h', p: 'R$ 80', c: 'var(--azul)' },
  { t: 'Rodada de Negócios', d: '18 — 20.08', p: 'R$ 120', c: 'var(--laranja)' },
  { t: 'Talk Mulheres', d: '18.08 · 18h', p: 'R$ 50', c: 'var(--ciano)' },
  {
    t: 'Oficinas e consultorias',
    d: '17 — 22.08',
    p: 'Gratuito',
    c: 'var(--verde)',
    slots: { open: 5, closed: 2 },
  },
  { t: 'Rodada de Crédito', d: '17 — 22.08', p: 'Gratuito', c: 'var(--verde)' },
]

const PATROCINADORES = [
  { n: 'Diamante', c: 'var(--laranja)', img: '/site/patrocinadores/diamante.png', h: 56, span: 6 },
  { n: 'Master', c: 'var(--laranja)', img: '/site/patrocinadores/master.png', h: 56, span: 6 },
  { n: 'Ouro', c: 'var(--verde)', img: '/site/patrocinadores/ouro.png', h: 130, span: 12 },
  { n: 'Prata', c: 'var(--ciano)', img: '/site/patrocinadores/prata.png', h: 52, span: 5 },
  {
    n: 'Apoio Institucional',
    c: 'var(--ink)',
    img: '/site/patrocinadores/apoio-institucional.png',
    h: 48,
    span: 4,
  },
  { n: 'Apoio', c: '#8a8c9c', img: '/site/patrocinadores/apoio.png', h: 72, span: 3 },
]

const MARQUEE_ITEMS = [
  { t: 'Feira Multissetorial', c: 'var(--verde)' },
  { t: 'Rodada de Negócios', c: 'var(--laranja)' },
  { t: 'Palestra Magna', c: 'var(--ciano)' },
  { t: 'Rodada de Crédito', c: 'var(--verde)' },
  { t: 'Talk Mulheres Empreendedoras', c: 'var(--laranja)' },
  { t: 'Oficinas de Negócios', c: 'var(--ciano)' },
  { t: 'Plantão de Consultorias', c: 'var(--verde)' },
]

export default function HomePage() {
  return (
    <div className="page-enter">
      <HomeHero />

      {/* MARQUEE */}
      <div
        style={{
          padding: '18px 0',
          background: 'var(--azul)',
          color: 'white',
          overflow: 'hidden',
          borderBottom: '1px solid var(--azul-900)',
        }}
      >
        <div className="marquee">
          <div
            className="marquee-track display"
            style={{ fontSize: 28, letterSpacing: '-.02em' }}
          >
            {Array.from({ length: 2 }).map((_, i) => (
              <span key={i} className="inline-flex gap-12 pr-12">
                {MARQUEE_ITEMS.map((it, j) => (
                  <span key={j} className="inline-flex items-center gap-12">
                    <span>{it.t}</span>
                    <span style={{ color: it.c }}>✦</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* REALIZAÇÃO */}
      <section style={{ padding: '80px 0 96px' }}>
        <div className="container-site">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-16 items-center">
            <div>
              <div className="eyebrow mb-4">
                <span className="dot" />
                REALIZAÇÃO
              </div>
              <h2
                className="display"
                style={{
                  fontSize: 'clamp(40px, 5vw, 58px)',
                  letterSpacing: '-.02em',
                  maxWidth: 498,
                }}
              >
                Um evento realizado por quem{' '}
                <span style={{ color: 'var(--laranja)' }}>vive</span> o comércio da cidade.
              </h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {REALIZADORES.map((r) => (
                <div
                  key={r.n}
                  className="bg-white border border-line rounded-xl flex flex-col justify-between gap-5"
                  style={{
                    padding: '28px 22px',
                    borderTop: `3px solid ${r.c}`,
                    minHeight: 262,
                  }}
                >
                  <div className="h-28 flex items-center justify-start">
                    <Image
                      src={r.logo}
                      alt={r.n}
                      width={160}
                      height={110}
                      className="max-h-full max-w-full object-contain object-left"
                    />
                  </div>
                  <div
                    className="text-[13px] leading-relaxed font-medium"
                    style={{ color: 'var(--ink-70)' }}
                  >
                    {r.d}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PROGRAMAÇÃO */}
      <section style={{ padding: '96px 0 118px' }}>
        <div className="container-site">
          <div className="flex justify-between items-end mb-14 flex-wrap gap-6">
            <div>
              <div className="eyebrow mb-4">
                <span className="dot" />
                PROGRAMAÇÃO 2026
              </div>
              <h2 className="display" style={{ fontSize: 'clamp(40px, 5vw, 58px)' }}>
                Seis dias.
                <br />
                Seis frentes de
                <br />
                desenvolvimento.
              </h2>
            </div>
            <p
              style={{
                maxWidth: 380,
                color: 'var(--ink-70)',
                lineHeight: 1.6,
              }}
            >
              A Semana Empresarial de Açailândia articula feira, capacitação, crédito e rodadas de
              negócios em um único território de oportunidades.
            </p>
          </div>

          <div
            className="program-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            {PROGRAMA.map((it, i) => (
              <div
                key={i}
                className="program-cell relative py-9 pr-7"
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <span
                    className="w-2 h-2 rounded-full block"
                    style={{ background: it.c }}
                  />
                  <span className="mono text-[11px] text-ink-50 tracking-[0.1em]">
                    {String(i + 1).padStart(2, '0')} / 08 · {it.day}
                  </span>
                </div>
                <h3
                  className="display mb-3"
                  style={{ fontSize: 26, letterSpacing: '-0.02em' }}
                >
                  {it.t}
                </h3>
                <p
                  style={{
                    fontSize: 14.5,
                    color: 'var(--ink-70)',
                    lineHeight: 1.55,
                  }}
                >
                  {it.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NÚMEROS 2025 */}
      <section
        style={{
          background: 'var(--ink)',
          color: 'white',
          padding: '96px 0 118px',
        }}
      >
        <div className="container-site">
          <div className="eyebrow mb-6" style={{ color: '#8a8ca8' }}>
            <span className="dot" style={{ background: 'var(--verde)' }} />
            EDIÇÃO 2025 · EM NÚMEROS
          </div>
          <h2
            className="display mb-16"
            style={{ fontSize: 'clamp(40px, 5vw, 58px)', maxWidth: 960 }}
          >
            5,29 milhões em negócios.
            <br />
            <span style={{ color: 'var(--verde)' }}>em seis dias.</span>
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {NUMEROS.map((s, i) => (
              <div
                key={i}
                style={{ borderTop: `2px solid ${s.c}`, paddingTop: 20 }}
              >
                <div
                  className="display"
                  style={{ fontSize: 'clamp(40px, 5vw, 72px)', lineHeight: 1 }}
                >
                  {s.n}
                </div>
                <div className="mt-3 text-sm" style={{ color: '#a0a2c2' }}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Link
              href="/sobre"
              className="btn btn-ghost btn-lg"
              style={{ borderColor: '#3a3c6a', color: 'white' }}
            >
              Ver relatório completo <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* INSCRIÇÕES PREVIEW */}
      <section style={{ padding: '96px 0 32px' }}>
        <div className="container-site">
          <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-12 items-center">
            <div>
              <div className="eyebrow mb-4">
                <span className="dot" />
                INSCRIÇÕES ABERTAS
              </div>
              <h2
                className="display mb-6"
                style={{
                  fontSize: 'clamp(40px, 5vw, 64px)',
                  letterSpacing: '-.03em',
                }}
              >
                Monte sua <span style={{ color: 'var(--verde)' }}>agenda</span> na semana.
              </h2>
              <p
                className="mb-8"
                style={{
                  fontSize: 17,
                  color: 'var(--ink-70)',
                  lineHeight: 1.6,
                  maxWidth: 420,
                }}
              >
                Escolha entre palestras, rodadas de negócios, oficinas e plantões. Algumas
                atividades são gratuitas, outras com valor simbólico.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Link href="/inscricoes" className="btn btn-primary btn-lg">
                  Fazer inscrição <ArrowRight size={16} />
                </Link>
                <Link href="/inscricoes" className="btn btn-ghost btn-lg">
                  Ver programação
                </Link>
              </div>
              <div
                className="mt-8 flex gap-8 pt-6"
                style={{ borderTop: '1px solid var(--line)' }}
              >
                <div>
                  <div
                    className="display"
                    style={{ fontSize: 36, letterSpacing: '-.02em' }}
                  >
                    7
                  </div>
                  <div className="mono text-[11px] text-ink-50 tracking-[0.1em]">ATIVIDADES</div>
                </div>
                <div>
                  <div
                    className="display"
                    style={{ fontSize: 36, letterSpacing: '-.02em' }}
                  >
                    4
                  </div>
                  <div className="mono text-[11px] text-ink-50 tracking-[0.1em]">GRATUITAS</div>
                </div>
                <div>
                  <div
                    className="display"
                    style={{
                      fontSize: 36,
                      letterSpacing: '-.02em',
                      color: 'var(--laranja)',
                    }}
                  >
                    R$ 50+
                  </div>
                  <div className="mono text-[11px] text-ink-50 tracking-[0.1em]">A PARTIR DE</div>
                </div>
              </div>
            </div>
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {INSCRICOES.map((x, i) => (
                  <InscricaoQuickCard
                    key={i}
                    title={x.t}
                    date={x.d}
                    price={x.p}
                    color={x.c}
                    slots={x.slots}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PATROCINADORES */}
      <section style={{ background: 'var(--paper-2)', padding: '96px 0 118px' }}>
        <div className="container-site">
          <div className="flex justify-between items-end mb-8 flex-wrap gap-4">
            <div>
              <div className="eyebrow mb-3">
                <span className="dot" />
                PATROCINADORES CONFIRMADOS · 2026
              </div>
              <h2
                className="display"
                style={{
                  fontSize: 'clamp(28px, 4vw, 58px)',
                  letterSpacing: '-.02em',
                }}
              >
                Marcas que acreditam na{' '}
                <span style={{ color: 'var(--laranja)' }}>semana.</span>
              </h2>
            </div>
            <Link href="/parceiros" className="btn btn-ghost">
              Ver todas as cotas <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-12 gap-2.5">
            {PATROCINADORES.map((t) => (
              <div
                key={t.n}
                className="flex flex-col gap-2.5 bg-white border border-line rounded-[10px]"
                style={{
                  gridColumn: `span ${t.span}`,
                  padding: '16px 18px',
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full block"
                    style={{ background: t.c }}
                  />
                  <div className="mono text-[10px] text-ink-50 tracking-[0.12em]">
                    {t.n.toUpperCase()}
                  </div>
                </div>
                <div
                  className="flex items-center justify-center"
                  style={{ minHeight: t.h }}
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

          <div
            className="mt-7 flex justify-between items-center flex-wrap gap-4 pt-6"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <p className="text-sm" style={{ color: 'var(--ink-70)' }}>
              Quer ter sua marca entre os apoiadores da 6ª edição?
            </p>
            <Link href="/parceiros" className="btn btn-primary">
              Quero ser parceiro <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ padding: '96px 0 118px' }}>
        <div className="container-site">
          <div
            className="relative overflow-hidden"
            style={{
              background: 'var(--laranja)',
              borderRadius: 24,
              padding: '72px 64px',
            }}
          >
            <div
              className="absolute"
              style={{
                right: -80,
                top: -80,
                width: 400,
                height: 400,
                border: '1px solid rgba(255,255,255,.25)',
                borderRadius: '50%',
              }}
            />
            <div
              className="absolute"
              style={{
                right: -40,
                top: -40,
                width: 300,
                height: 300,
                border: '1px solid rgba(255,255,255,.25)',
                borderRadius: '50%',
              }}
            />
            <div className="relative" style={{ maxWidth: 720 }}>
              <div className="eyebrow mb-4" style={{ color: 'rgba(255,255,255,.8)' }}>
                <span className="dot" style={{ background: 'white' }} />
                RESERVE SEU LUGAR
              </div>
              <h2
                className="display mb-6"
                style={{ fontSize: 'clamp(36px, 5vw, 64px)', color: 'white' }}
              >
                Os melhores stands vão primeiro.
              </h2>
              <p
                className="mb-8"
                style={{
                  fontSize: 17,
                  color: 'rgba(255,255,255,.9)',
                  lineHeight: 1.55,
                  maxWidth: 540,
                }}
              >
                Escolha sua posição no mapa, garanta seu stand e integre o maior encontro de
                negócios do sudoeste maranhense.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Link
                  href="/expositores"
                  className="btn btn-lg"
                  style={{ background: 'white', color: 'var(--laranja)' }}
                >
                  Ver mapa de stands <ArrowRight size={16} />
                </Link>
                <Link
                  href="/parceiros"
                  className="btn btn-lg"
                  style={{
                    background: 'transparent',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,.5)',
                  }}
                >
                  Cotas de patrocínio
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
