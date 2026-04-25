import { Calendar, MousePointerClick, CalendarCheck2, CreditCard, FileDown } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import InscricoesListClient from '@/components/eventos/InscricoesListClient'
import ProgramacaoButton from '@/components/carrinho/ProgramacaoButton'
import type { Event } from '@/types/database'

type EventWithCounts = Event & {
  inscriptionsCount: number
  halfPriceUsed: number
}

export const dynamic = 'force-dynamic'

async function getEvents(): Promise<EventWithCounts[]> {
  const supabase = createServerSupabaseClient()

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'active')
    .order('event_date', { ascending: true })

  if (error) console.error('[inscricoes] events error:', error.message)
  console.log('[inscricoes] events fetched:', events?.length ?? 0)

  if (!events || events.length === 0) return []

  const ids = events.map((e) => e.id)
  const { data: counts } = await supabase
    .from('inscriptions')
    .select('event_id, quantity, is_half_price, payment_status')
    .in('event_id', ids)
    .in('payment_status', ['confirmed', 'pending', 'free'])

  return events.map((ev) => {
    const evCounts = counts?.filter((c) => c.event_id === ev.id) ?? []
    const inscriptionsCount = evCounts.reduce((acc, c) => acc + (c.quantity || 0), 0)
    const halfPriceUsed = evCounts
      .filter((c) => c.is_half_price)
      .reduce((acc, c) => acc + (c.quantity || 0), 0)
    return { ...ev, inscriptionsCount, halfPriceUsed }
  })
}

export const metadata = {
  title: 'Inscrições · Semana Empresarial de Açailândia',
  description:
    'Garanta sua vaga nas atividades da Semana Empresarial de Açailândia 2026. Palestras, oficinas, rodadas de negócios e mais.',
}

export default async function InscricoesPage() {
  const events = await getEvents()

  return (
    <div className="page-enter">
      <section style={{ padding: '64px 0 32px' }}>
        <div className="container-site">
          <div className="eyebrow mb-6">
            <span className="dot" />
            INSCRIÇÕES · 6ª EDIÇÃO
          </div>
          <h1
            className="display mb-6"
            style={{ fontSize: 80, maxWidth: 1100 }}
          >
            Garanta sua <span style={{ color: 'var(--laranja)' }}>vaga</span>.
          </h1>
          <p
            className="text-lg leading-relaxed"
            style={{ color: 'var(--ink-70)', maxWidth: 700 }}
          >
            Escolha as atividades que você quer participar. Algumas são gratuitas, outras com valor
            simbólico. Monte sua programação e finalize a inscrição.
          </p>

          <div className="mt-10 pt-8" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="eyebrow mb-5">
              <span className="dot" />
              COMO SE INSCREVER
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  n: '01',
                  icon: MousePointerClick,
                  title: 'Selecione os eventos',
                  desc: 'Clique em "Adicionar" em um ou vários eventos que você quer participar.',
                  color: 'var(--laranja)',
                  bg: 'rgba(248,130,30,0.12)',
                },
                {
                  n: '02',
                  icon: CalendarCheck2,
                  title: 'Clique em "Ver minha programação"',
                  desc: 'O botão aparece em destaque com a quantidade de eventos selecionados.',
                  color: 'var(--ciano-600)',
                  bg: 'rgba(86,198,208,0.15)',
                },
                {
                  n: '03',
                  icon: CreditCard,
                  title: 'Preencha e finalize',
                  desc: 'Informe seus dados e, se o evento for pago, conclua o pagamento online.',
                  color: 'var(--verde-600)',
                  bg: 'rgba(166,206,58,0.18)',
                },
                {
                  n: '04',
                  icon: FileDown,
                  title: 'Baixe o comprovante',
                  desc: 'Após a confirmação, baixe o PDF com o QR Code — ele vale para todos os eventos.',
                  color: 'var(--azul)',
                  bg: 'var(--azul-50)',
                },
              ].map((step) => {
                const Icon = step.icon
                return (
                  <div
                    key={step.n}
                    className="bg-white border border-line rounded-2xl"
                    style={{ padding: 20 }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="rounded-xl grid place-items-center"
                        style={{
                          width: 42,
                          height: 42,
                          background: step.bg,
                          color: step.color,
                        }}
                      >
                        <Icon size={20} />
                      </div>
                      <span
                        className="mono text-[11px] font-semibold tracking-[0.1em]"
                        style={{ color: 'var(--ink-50)' }}
                      >
                        {step.n}
                      </span>
                    </div>
                    <h4
                      className="display mb-1.5"
                      style={{ fontSize: 16, letterSpacing: '-.01em' }}
                    >
                      {step.title}
                    </h4>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: 'var(--ink-70)' }}
                    >
                      {step.desc}
                    </p>
                  </div>
                )
              })}
            </div>

            <p
              className="mt-4 text-xs"
              style={{ color: 'var(--ink-50)' }}
            >
              Dica: você pode comprar vários eventos de uma só vez — o pagamento é único e o QR Code
              serve para todos.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ProgramacaoButton variant="cyan" />
          </div>
        </div>
      </section>

      <section style={{ padding: '24px 0 96px' }}>
        <div className="container-site">
          <div className="eyebrow mb-6">
            <span className="dot" />
            ATIVIDADES DISPONÍVEIS · {events.length} {events.length === 1 ? 'evento' : 'eventos'}
          </div>

          {events.length === 0 ? (
            <div
              className="bg-white border border-line rounded-2xl text-center"
              style={{ padding: '64px 32px' }}
            >
              <div
                className="w-14 h-14 rounded-full grid place-items-center mx-auto mb-4"
                style={{ background: 'var(--paper-2)' }}
              >
                <Calendar size={22} />
              </div>
              <h3
                className="display mb-2"
                style={{ fontSize: 22, letterSpacing: '-.02em' }}
              >
                Nenhum evento disponível no momento
              </h3>
              <p className="text-sm" style={{ color: 'var(--ink-70)' }}>
                A programação completa será divulgada em breve. Acompanhe nossas redes.
              </p>
            </div>
          ) : (
            <InscricoesListClient events={events} />
          )}

          {/* Footer CTA */}
          <div
            className="mt-12 rounded-2xl flex justify-between items-center flex-wrap gap-6"
            style={{ background: 'var(--paper-2)', padding: '40px 32px' }}
          >
            <div>
              <div className="eyebrow mb-2">
                <span className="dot" />
                JÁ ESCOLHEU?
              </div>
              <h3 className="display" style={{ fontSize: 24, letterSpacing: '-.02em' }}>
                Finalize sua programação para a semana
              </h3>
            </div>
            <ProgramacaoButton variant="primary" size="lg" />
          </div>
        </div>
      </section>
    </div>
  )
}
