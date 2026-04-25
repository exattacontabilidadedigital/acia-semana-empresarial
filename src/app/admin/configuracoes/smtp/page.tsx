import { Mail, AlertCircle, CheckCircle2, Send } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  saveSmtpConfigAction,
  testSmtpAction,
} from '@/app/admin/certificados/actions'

export const dynamic = 'force-dynamic'

export default async function SmtpPage({
  searchParams,
}: {
  searchParams: { saved?: string; test_sent?: string; error?: string }
}) {
  const supabase = createServerSupabaseClient()
  const { data: cfg } = await supabase
    .from('smtp_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  const c: any = cfg ?? {}

  return (
    <div className="page-enter">
      <div className="mb-8">
        <div className="eyebrow mb-4">
          <span className="dot" />
          CONFIGURAÇÕES · EMAIL (SMTP)
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
          Email (SMTP)
        </h1>
        <p
          className="mt-3"
          style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 620 }}
        >
          Configure o servidor de envio de emails. Usado pra lembretes de
          inscrição, pagamento e envio de certificados. Quando preenchida, esta
          configuração tem prioridade sobre as variáveis de ambiente.
        </p>
      </div>

      {searchParams.saved && (
        <Banner
          icon={<CheckCircle2 size={14} />}
          color="success"
          text="Configuração salva."
        />
      )}
      {searchParams.test_sent && (
        <Banner
          icon={<CheckCircle2 size={14} />}
          color="success"
          text="Email de teste enviado com sucesso!"
        />
      )}
      {searchParams.error && (
        <Banner
          icon={<AlertCircle size={14} />}
          color="error"
          text={searchParams.error}
        />
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        {/* Form principal */}
        <form
          action={saveSmtpConfigAction}
          className="rounded-2xl bg-white p-7 space-y-5"
          style={{ border: '1px solid var(--line)' }}
        >
          <div
            className="mono text-[10px] tracking-[0.14em] mb-2"
            style={{ color: 'var(--ink-50)' }}
          >
            CONEXÃO
          </div>

          <div className="grid sm:grid-cols-[1fr_120px] gap-4">
            <Field
              label="HOST *"
              name="host"
              defaultValue={c.host ?? 'smtp.gmail.com'}
              placeholder="smtp.gmail.com"
              required
            />
            <Field
              label="PORTA"
              name="port"
              type="number"
              defaultValue={String(c.port ?? 587)}
              placeholder="587"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="USUÁRIO *"
              name="username"
              defaultValue={c.username ?? ''}
              placeholder="usuario@gmail.com"
              required
            />
            <Field
              label="SENHA *"
              name="password"
              type="password"
              defaultValue={c.password ?? ''}
              placeholder="senha de app do Gmail"
              required
            />
          </div>

          <div
            className="mono text-[10px] tracking-[0.14em] mt-6 mb-2"
            style={{ color: 'var(--ink-50)' }}
          >
            REMETENTE
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="EMAIL DE ORIGEM"
              name="from_email"
              defaultValue={c.from_email ?? ''}
              placeholder="acia.aca@gmail.com"
            />
            <Field
              label="NOME DE EXIBIÇÃO"
              name="from_name"
              defaultValue={c.from_name ?? ''}
              placeholder="Semana Empresarial"
            />
          </div>

          <label
            className="flex items-center gap-2 text-sm pt-3"
            style={{ color: 'var(--ink-70)' }}
          >
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={c.enabled ?? true}
            />
            Configuração ativa (desmarcar volta a usar variáveis de ambiente)
          </label>

          <div
            className="flex flex-wrap gap-3 pt-4"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <button type="submit" className="btn btn-orange btn-lg">
              <Mail size={14} /> Salvar configuração
            </button>
          </div>
        </form>

        {/* Sidebar — testar */}
        <aside className="space-y-5 lg:sticky lg:top-24 self-start">
          <form
            action={testSmtpAction}
            className="rounded-2xl bg-white p-6"
            style={{ border: '1px solid var(--line)' }}
          >
            <div
              className="mono text-[10px] tracking-[0.14em] mb-3"
              style={{ color: 'var(--ink-50)' }}
            >
              TESTAR ENVIO
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--ink-70)' }}>
              Salve a configuração antes de testar. Enviamos um email de teste
              pro endereço informado.
            </p>
            <Field
              label="ENVIAR PARA"
              name="to"
              type="email"
              defaultValue={c.test_email_to ?? c.from_email ?? ''}
              placeholder="seu@email.com"
            />
            <button
              type="submit"
              className="btn btn-ghost btn-lg w-full justify-center mt-4"
            >
              <Send size={13} /> Enviar teste
            </button>
            {c.test_sent_at && (
              <div
                className="text-xs mt-3 pt-3"
                style={{
                  borderTop: '1px solid var(--line)',
                  color: c.test_last_error ? '#b91c1c' : 'var(--verde-600)',
                }}
              >
                Último teste:{' '}
                {new Date(c.test_sent_at).toLocaleString('pt-BR')}
                {c.test_last_error && (
                  <div className="mt-1 text-[11px]">
                    Erro: {c.test_last_error}
                  </div>
                )}
              </div>
            )}
          </form>

          <div
            className="rounded-2xl p-5 text-xs"
            style={{
              background: 'var(--paper-2)',
              color: 'var(--ink-70)',
              border: '1px solid var(--line)',
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: 'var(--ink)' }}>Gmail:</strong> use{' '}
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--azul)' }}
            >
              senha de app
            </a>
            , não a senha da conta. Habilite 2FA primeiro.
          </div>
        </aside>
      </div>
    </div>
  )
}

function Banner({
  icon,
  color,
  text,
}: {
  icon: React.ReactNode
  color: 'success' | 'error'
  text: string
}) {
  const styles =
    color === 'success'
      ? {
          bg: 'rgba(166,206,58,0.10)',
          border: '1px solid rgba(166,206,58,0.4)',
          color: '#3d5a0a',
        }
      : { bg: '#fff1f2', border: '1px solid #fecdd3', color: '#b91c1c' }
  return (
    <div
      className="mb-5 p-3 rounded-xl text-sm flex items-center gap-2"
      style={styles}
    >
      {icon}
      {text}
    </div>
  )
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = 'text',
  required,
}: {
  label: string
  name: string
  defaultValue?: string
  placeholder?: string
  type?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span
        className="mono block text-[10px] tracking-[0.1em] mb-2"
        style={{ color: 'var(--ink-50)' }}
      >
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="admin-input w-full px-4 py-3 rounded-xl text-sm"
      />
    </label>
  )
}
