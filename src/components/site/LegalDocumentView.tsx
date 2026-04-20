import Link from 'next/link'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'

export type LegalSection = {
  number: string | null
  title: string
  body: string
}

export type LegalDocumentViewProps = {
  title: string
  eyebrow: string | null
  lastRevision: string | null
  intro: string | null
  sections: LegalSection[]
  bottomLink?: { href: string; label: string }
}

/**
 * Render compartilhado pra /termos e /privacidade.
 * Body de cada seção é HTML simples (p, strong, a, ul, li) renderizado
 * via dangerouslySetInnerHTML — escopado a um `<div className="legal-body">`
 * com estilos consistentes.
 */
export default function LegalDocumentView({
  title,
  eyebrow,
  lastRevision,
  intro,
  sections,
  bottomLink,
}: LegalDocumentViewProps) {
  return (
    <main
      className="min-h-screen page-enter"
      style={{ background: 'var(--paper)', color: 'var(--ink)' }}
    >
      <div
        className="container-site"
        style={{ paddingTop: 64, paddingBottom: 96, maxWidth: 880 }}
      >
        <Link
          href="/"
          className="mono text-[11px] tracking-[0.14em] inline-flex items-center gap-1 mb-8 hover:opacity-70 transition-opacity"
          style={{ color: 'var(--ink-50)' }}
        >
          <ArrowLeft size={12} /> VOLTAR PARA O SITE
        </Link>

        <div className="mb-12">
          {eyebrow && (
            <div className="eyebrow mb-4">
              <span className="dot" />
              {eyebrow}
            </div>
          )}
          <h1 className="display" style={{ fontSize: 'clamp(40px, 5.6vw, 64px)' }}>
            {title}
          </h1>
          {lastRevision && (
            <p
              className="mono text-[11px] tracking-[0.14em] mt-4"
              style={{ color: 'var(--ink-50)' }}
            >
              ÚLTIMA ATUALIZAÇÃO · {lastRevision.toUpperCase()}
            </p>
          )}
          {intro && (
            <p
              className="mt-5"
              style={{ color: 'var(--ink-70)', fontSize: 16, maxWidth: 640 }}
            >
              {intro}
            </p>
          )}
        </div>

        <article
          className="rounded-[20px] bg-white p-7 sm:p-10"
          style={{
            border: '1px solid var(--line)',
            color: 'var(--ink-70)',
            fontSize: 15,
            lineHeight: 1.65,
          }}
        >
          {sections.length === 0 && (
            <div
              className="text-center py-12 mono text-[11px] tracking-[0.14em]"
              style={{ color: 'var(--ink-50)' }}
            >
              CONTEÚDO EM ELABORAÇÃO
            </div>
          )}
          {sections.map((s, idx) => {
            const isLast = idx === sections.length - 1
            return (
              <section
                key={idx}
                className={isLast ? '' : 'mb-10 pb-10'}
                style={
                  !isLast ? { borderBottom: '1px solid var(--line)' } : undefined
                }
              >
                <div className="flex items-baseline gap-3 mb-4">
                  {s.number && (
                    <span
                      className="mono text-[11px] tracking-[0.14em] shrink-0"
                      style={{ color: 'var(--laranja)' }}
                    >
                      {s.number}
                    </span>
                  )}
                  <h2
                    className="display"
                    style={{
                      fontSize: 'clamp(20px, 2.4vw, 26px)',
                      letterSpacing: '-0.02em',
                      color: 'var(--ink)',
                    }}
                  >
                    {s.title}
                  </h2>
                </div>
                <div
                  className="legal-body space-y-3"
                  dangerouslySetInnerHTML={{ __html: s.body }}
                />
              </section>
            )
          })}
        </article>

        {bottomLink && (
          <div className="mt-8 text-center">
            <Link
              href={bottomLink.href}
              className="mono text-[11px] tracking-[0.14em] inline-flex items-center gap-1 hover:opacity-70 transition-opacity"
              style={{ color: 'var(--azul)' }}
            >
              {bottomLink.label} <ArrowUpRight size={12} />
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
