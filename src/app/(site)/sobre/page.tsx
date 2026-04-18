import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

type StatCardProps = {
  value: string
  unit?: string
  label: string
  bg: string
  fg: string
  border?: boolean
  big?: boolean
}

function StatCard({ value, unit, label, bg, fg, border, big }: StatCardProps) {
  return (
    <div
      className="rounded-2xl flex flex-col justify-between relative overflow-hidden"
      style={{
        background: bg,
        color: fg,
        padding: big ? '36px 32px' : '28px 24px',
        border: border ? '1px solid var(--line)' : 'none',
        minHeight: big ? 220 : 160,
      }}
    >
      <div className="mono text-[11px] tracking-[0.1em] opacity-70">—</div>
      <div>
        <div
          className="display"
          style={{
            fontSize: big ? 'clamp(56px, 8vw, 120px)' : 'clamp(36px, 5vw, 64px)',
            letterSpacing: '-.03em',
            lineHeight: 0.9,
          }}
        >
          {value}
          {unit && (
            <span className="ml-2 opacity-70 font-medium" style={{ fontSize: '.4em' }}>
              {unit}
            </span>
          )}
        </div>
        <div
          className="mt-3.5 max-w-[280px]"
          style={{ fontSize: big ? 16 : 13.5, opacity: 0.85 }}
        >
          {label}
        </div>
      </div>
    </div>
  )
}

const PILLARS = [
  {
    k: '01',
    c: 'var(--laranja)',
    t: 'Conectar',
    d: 'Aproximar empresas, investidores, governo e empreendedores em um calendário único. Criar o lugar onde os negócios da região acontecem.',
  },
  {
    k: '02',
    c: 'var(--verde)',
    t: 'Capacitar',
    d: 'Oficinas, palestras e talks para elevar o nível de gestão dos pequenos e médios negócios do sudoeste maranhense.',
  },
  {
    k: '03',
    c: 'var(--ciano)',
    t: 'Financiar',
    d: 'O Mutirão de Crédito reúne bancos de fomento em um só espaço, destravando capital para empresas que querem crescer.',
  },
]

const WEEK = [
  {
    d: '17',
    w: 'SEG',
    t: 'Abertura',
    e: ['Palestra Magna', 'Feira aberta', 'Mutirão'],
    c: 'var(--laranja)',
  },
  {
    d: '18',
    w: 'TER',
    t: 'Conexão',
    e: ['Rodada de Negócios', 'Oficinas', 'Feira'],
    c: 'var(--laranja)',
  },
  {
    d: '19',
    w: 'QUA',
    t: 'Liderança',
    e: ['Talk Mulheres', 'Rodada', 'Feira'],
    c: 'var(--ciano)',
  },
  {
    d: '20',
    w: 'QUI',
    t: 'Capital',
    e: ['Rodada final', 'Mutirão', 'Feira'],
    c: 'var(--verde)',
  },
  {
    d: '21',
    w: 'SEX',
    t: 'Território',
    e: ['Showcase', 'Feira ampliada', 'Oficinas'],
    c: 'var(--laranja)',
  },
  {
    d: '22',
    w: 'SÁB',
    t: 'Encerramento',
    e: ['Premiação', 'Feira', 'Celebração'],
    c: 'var(--laranja)',
  },
]

export const metadata = {
  title: 'Sobre · Semana Empresarial de Açailândia',
  description:
    'Conheça a história, os pilares e a estrutura da Semana Empresarial de Açailândia — o maior encontro de negócios do sudoeste maranhense.',
}

export default function SobrePage() {
  return (
    <div className="page-enter">
      <section style={{ padding: '64px 0 32px' }}>
        <div className="container-site">
          <div className="eyebrow mb-6">
            <span className="dot" />
            SOBRE O EVENTO
          </div>
          <h1
            className="display mb-10"
            style={{ fontSize: 'clamp(48px, 8vw, 120px)', maxWidth: 1100 }}
          >
            Um território inteiro em{' '}
            <span style={{ color: 'var(--ciano)' }}>modo negócio</span> durante uma semana.
          </h1>
          <div
            className="grid grid-cols-1 lg:grid-cols-2 gap-16 pt-8"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <p className="text-lg leading-relaxed" style={{ color: 'var(--ink-70)' }}>
              A Semana Empresarial de Açailândia nasceu em 2020 como uma resposta local ao desafio
              de fortalecer a economia do sudoeste maranhense. Cinco edições depois, virou o maior
              encontro multissetorial de negócios da região — reunindo indústria, comércio,
              serviços, agronegócio e setor público em um só lugar.
            </p>
            <p className="text-lg leading-relaxed" style={{ color: 'var(--ink-70)' }}>
              Mais do que uma feira, é uma infraestrutura viva de conexões: rodadas de negócios,
              crédito, capacitação, talks, palestras e uma feira multissetorial com mais de 80
              expositores. Conexões que geram vendas, vendas que geram desenvolvimento.
            </p>
          </div>
        </div>
      </section>

      {/* Big numbers 2025 */}
      <section style={{ paddingTop: 56, paddingBottom: 96 }}>
        <div className="container-site">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
            <h2 className="display" style={{ fontSize: 'clamp(40px, 5vw, 58px)' }}>
              Edição 2025 em números
            </h2>
            <span className="mono text-xs" style={{ color: 'var(--ink-50)' }}>
              5ª EDIÇÃO · 28.07 — 02.08 · 2025
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-4 mb-4">
            <StatCard
              big
              value="R$ 5,29"
              unit="milhões"
              label="Em negócios imediatos gerados nas rodadas"
              bg="var(--laranja)"
              fg="white"
            />
            <StatCard value="7.200" label="Participantes" bg="var(--verde)" fg="#1a3300" />
            <StatCard value="+1.000" label="Empresas" bg="var(--laranja)" fg="#3a1600" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_2fr] gap-4 mb-4">
            <StatCard value="80" label="Expositores na feira" bg="var(--ciano)" fg="#062e36" />
            <StatCard
              value="147"
              label="Visitantes/dia por empresa"
              bg="white"
              fg="var(--ink)"
              border
            />
            <StatCard
              value="R$ 1 mi+"
              label="Mobilizado em crédito durante o mutirão"
              bg="var(--ink)"
              fg="white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              value="688 mil"
              label="Visualizações nos últimos 30 dias da edição"
              bg="white"
              fg="var(--ink)"
              border
            />
            <StatCard
              value="9.600"
              label="Interações nas redes"
              bg="white"
              fg="var(--ink)"
              border
            />
            <StatCard
              value="16"
              unit="cotas"
              label="Cotas de patrocínio confirmadas"
              bg="white"
              fg="var(--ink)"
              border
            />
          </div>
        </div>
      </section>

      {/* Pilares */}
      <section style={{ padding: '0 0 96px' }}>
        <div className="container-site">
          <div className="eyebrow mb-5">
            <span className="dot" />
            PILARES
          </div>
          <h2
            className="display mb-14"
            style={{ fontSize: 'clamp(40px, 5vw, 58px)', maxWidth: 900 }}
          >
            Três frentes, um objetivo: desenvolvimento regional.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PILLARS.map((p) => (
              <div
                key={p.k}
                className="bg-white border border-line rounded-2xl relative"
                style={{ padding: 32 }}
              >
                <div className="flex items-center gap-3 mb-10">
                  <span
                    className="w-2.5 h-2.5 rounded-full block"
                    style={{ background: p.c }}
                  />
                  <span className="mono text-[11px] text-ink-50 tracking-[0.1em]">{p.k}</span>
                </div>
                <h3 className="display mb-4" style={{ fontSize: 40, letterSpacing: '-.03em' }}>
                  {p.t}
                </h3>
                <p className="leading-relaxed" style={{ fontSize: 15, color: 'var(--ink-70)' }}>
                  {p.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Semana em movimento */}
      <section style={{ background: 'var(--paper-2)', padding: '96px 0' }}>
        <div className="container-site">
          <div className="eyebrow mb-5">
            <span className="dot" />
            UMA SEMANA EM MOVIMENTO
          </div>
          <h2
            className="display mb-14"
            style={{ fontSize: 'clamp(40px, 5vw, 58px)' }}
          >
            Como se organiza o evento
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {WEEK.map((day, i) => (
              <div
                key={i}
                className="bg-white rounded-xl"
                style={{ padding: '24px 18px', borderTop: `3px solid ${day.c}` }}
              >
                <div className="flex justify-between items-baseline mb-4">
                  <div className="display" style={{ fontSize: 40, letterSpacing: '-.03em' }}>
                    {day.d}
                  </div>
                  <div className="mono text-[10px] text-ink-50 tracking-[0.1em]">{day.w}</div>
                </div>
                <div className="font-semibold text-sm mb-3.5">{day.t}</div>
                <ul className="flex flex-col gap-1.5 text-xs" style={{ color: 'var(--ink-70)' }}>
                  {day.e.map((ev, j) => (
                    <li key={j} className="relative pl-2.5">
                      <span
                        className="absolute left-0 top-1.5 w-1 h-1"
                        style={{ background: 'var(--ink-50)' }}
                      />
                      {ev}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Manifesto + CTA */}
      <section style={{ padding: '96px 0' }}>
        <div className="container-site">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div
              className="ph rounded-2xl"
              style={{ height: 480 }}
              aria-hidden
            >
              <span>FOTO ABERTURA · PALCO</span>
            </div>
            <div>
              <div className="eyebrow mb-5">
                <span className="dot" />
                MANIFESTO
              </div>
              <h2
                className="display mb-6"
                style={{ fontSize: 'clamp(40px, 5vw, 58px)' }}
              >
                Desenvolvimento não acontece sozinho.{' '}
                <span style={{ color: 'var(--laranja)' }}>Se organiza.</span>
              </h2>
              <p
                className="mb-6"
                style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--ink-70)' }}
              >
                A Semana Empresarial é onde o sudoeste maranhense marca o seu compasso. Por seis
                dias, empresas, governo, academia e sociedade se encontram para projetar a próxima
                década da região.
              </p>
              <p
                className="mb-8"
                style={{ fontSize: 17, lineHeight: 1.6, color: 'var(--ink-70)' }}
              >
                É pouco tempo para um movimento tão grande. Por isso, cada minuto é desenhado para
                gerar valor — da primeira rodada ao último aperto de mão.
              </p>
              <Link href="/edicoes" className="btn btn-primary">
                Ver edições anteriores <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
