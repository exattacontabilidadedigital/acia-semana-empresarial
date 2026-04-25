import { CheckCircle2, XCircle, Calendar, User, Award } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function maskCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return '***.***.***-**'
  return `***.${digits.substring(3, 6)}.***-**`
}

function formatDateBr(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

export default async function VerificarCertificadoPage({
  params,
}: {
  params: { code: string }
}) {
  const code = params.code
  const admin = createAdminClient()

  const { data: cert } = await admin
    .from('certificates')
    .select(
      'verification_code, participant_name, participant_cpf, event_title, event_date, duration_hours, issued_at, revoked_at, revoked_reason'
    )
    .eq('verification_code', code)
    .maybeSingle()

  const valid = !!cert && !cert.revoked_at
  const revoked = !!cert?.revoked_at

  return (
    <div className="page-enter">
      <section style={{ padding: '64px 0 96px' }}>
        <div
          className="container-site"
          style={{ maxWidth: 720 }}
        >
          <div className="eyebrow mb-4">
            <span className="dot" />
            VERIFICAÇÃO DE CERTIFICADO
          </div>

          <h1
            className="display mb-3"
            style={{ fontSize: 'clamp(36px, 5vw, 56px)' }}
          >
            {valid ? (
              <>
                Certificado{' '}
                <span style={{ color: 'var(--verde)' }}>autêntico</span>.
              </>
            ) : revoked ? (
              <>
                Certificado{' '}
                <span style={{ color: '#b91c1c' }}>revogado</span>.
              </>
            ) : (
              <>
                Código{' '}
                <span style={{ color: 'var(--ink-50)' }}>não encontrado</span>.
              </>
            )}
          </h1>

          <p
            className="text-base mb-10"
            style={{ color: 'var(--ink-70)', maxWidth: 540 }}
          >
            Código consultado:{' '}
            <code style={{ background: 'var(--paper-2)', padding: '2px 8px', borderRadius: 6 }}>
              {code}
            </code>
          </p>

          {!cert ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{
                background: 'var(--paper-2)',
                border: '1px solid var(--line)',
              }}
            >
              <XCircle
                size={48}
                style={{ color: 'var(--ink-50)' }}
                className="mx-auto mb-4"
              />
              <p style={{ color: 'var(--ink-70)' }}>
                Nenhum certificado encontrado com esse código. Verifique se digitou
                corretamente.
              </p>
            </div>
          ) : (
            <div
              className="rounded-2xl bg-white"
              style={{ border: '1px solid var(--line)', padding: 32 }}
            >
              <div className="flex items-center gap-3 mb-8 pb-6"
                   style={{ borderBottom: '1px solid var(--line)' }}>
                {valid ? (
                  <CheckCircle2 size={32} style={{ color: 'var(--verde-600)' }} />
                ) : (
                  <XCircle size={32} style={{ color: '#b91c1c' }} />
                )}
                <div>
                  <div
                    className="mono text-[10px] tracking-[0.14em]"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    STATUS
                  </div>
                  <div
                    className="display"
                    style={{
                      fontSize: 22,
                      color: valid ? 'var(--verde-600)' : '#b91c1c',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {valid ? 'Válido' : 'Revogado'}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <Field
                  icon={<User size={16} />}
                  label="PARTICIPANTE"
                  value={cert.participant_name}
                />
                <Field
                  icon={<Award size={16} />}
                  label="EVENTO"
                  value={cert.event_title}
                />
                <Field
                  icon={<Calendar size={16} />}
                  label="DATA DO EVENTO"
                  value={formatDateBr(String(cert.event_date))}
                />
                {cert.duration_hours != null && (
                  <Field
                    icon={<span style={{ fontWeight: 700 }}>⏱</span>}
                    label="CARGA HORÁRIA"
                    value={`${String(cert.duration_hours).replace(/\.?0+$/, '')} horas`}
                  />
                )}
                <Field
                  icon={<span style={{ fontWeight: 700 }}>#</span>}
                  label="CPF (PARCIAL)"
                  value={maskCpf(cert.participant_cpf)}
                />
                <Field
                  icon={<span style={{ fontWeight: 700 }}>📅</span>}
                  label="EMITIDO EM"
                  value={formatDateBr(
                    new Date(cert.issued_at).toISOString().slice(0, 10)
                  )}
                />
              </div>

              {revoked && cert.revoked_reason && (
                <div
                  className="mt-6 pt-6 rounded-xl p-4"
                  style={{
                    background: '#fff1f2',
                    border: '1px solid #fecdd3',
                    borderTop: '1px solid var(--line)',
                  }}
                >
                  <div
                    className="mono text-[10px] tracking-[0.14em] mb-1"
                    style={{ color: '#b91c1c' }}
                  >
                    MOTIVO DA REVOGAÇÃO
                  </div>
                  <p style={{ color: '#7f1d1d', fontSize: 13 }}>
                    {cert.revoked_reason}
                  </p>
                </div>
              )}
            </div>
          )}

          <p
            className="mt-8 text-xs"
            style={{ color: 'var(--ink-50)' }}
          >
            Esta página exibe apenas dados públicos pra fins de validação.
            CPFs são parcialmente ocultados por privacidade (LGPD).
          </p>
        </div>
      </section>
    </div>
  )
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-9 h-9 rounded-lg grid place-items-center shrink-0 mt-0.5"
        style={{ background: 'var(--paper-2)', color: 'var(--ink-50)' }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div
          className="mono text-[10px] tracking-[0.14em] mb-1"
          style={{ color: 'var(--ink-50)' }}
        >
          {label}
        </div>
        <div className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
          {value}
        </div>
      </div>
    </div>
  )
}
