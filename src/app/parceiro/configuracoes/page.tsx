import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireOrgOwner, ORG_TYPE_LABELS, ORG_STATUS_LABELS } from '@/lib/orgs'

export const dynamic = 'force-dynamic'

async function updateOrgAction(formData: FormData) {
  'use server'
  const org = await requireOrgOwner()

  const patch: Record<string, any> = {
    name: String(formData.get('name') ?? '').trim(),
    type: String(formData.get('type') ?? '').trim(),
    cnpj: String(formData.get('cnpj') ?? '').trim() || null,
    email: String(formData.get('email') ?? '').trim().toLowerCase() || null,
    phone: String(formData.get('phone') ?? '').trim() || null,
    website: String(formData.get('website') ?? '').trim() || null,
    description: String(formData.get('description') ?? '').trim() || null,
    brand_color: String(formData.get('brand_color') ?? '').trim() || null,
    logo_url: String(formData.get('logo_url') ?? '').trim() || null,
  }

  if (!patch.name || !patch.type) {
    redirect(
      `/parceiro/configuracoes?error=${encodeURIComponent('Nome e tipo são obrigatórios.')}`
    )
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('organizations')
    .update(patch)
    .eq('id', org.id)

  if (error) {
    redirect(`/parceiro/configuracoes?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/parceiro/configuracoes')
  redirect('/parceiro/configuracoes?saved=1')
}

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: { error?: string; saved?: string }
}) {
  const org = await requireOrgOwner()
  const admin = createAdminClient()

  const { data: full } = await admin
    .from('organizations')
    .select('*')
    .eq('id', org.id)
    .maybeSingle()

  if (!full) redirect('/parceiro/dashboard')

  const STATUS_PILL: Record<string, { bg: string; color: string }> = {
    active: { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a' },
    suspended: { bg: 'rgba(248,130,30,0.15)', color: '#b85d00' },
    archived: { bg: 'var(--paper-2)', color: 'var(--ink-50)' },
  }
  const statusStyle = STATUS_PILL[full.status] ?? STATUS_PILL.active

  return (
    <div className="page-enter max-w-3xl">
      <div className="mb-10">
        <div className="eyebrow mb-4">
          <span className="dot" />
          PORTAL · CONFIGURAÇÕES
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
          Dados da organização
        </h1>
        <p
          className="mt-3"
          style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
        >
          Atualize as informações que aparecem no portal e nos eventos da{' '}
          <strong>{full.name}</strong>.
        </p>
      </div>

      {searchParams.error && (
        <Banner color="error">{searchParams.error}</Banner>
      )}
      {searchParams.saved && (
        <Banner color="success">Alterações salvas com sucesso.</Banner>
      )}

      {/* Read-only header */}
      <div
        className="rounded-[20px] bg-white p-5 mb-5 flex items-center justify-between gap-4 flex-wrap"
        style={{ border: '1px solid var(--line)' }}
      >
        <div>
          <div
            className="mono text-[10px] tracking-[0.14em]"
            style={{ color: 'var(--ink-50)' }}
          >
            SLUG
          </div>
          <div className="mono text-sm" style={{ color: 'var(--ink)' }}>
            /{full.slug}
          </div>
        </div>
        <span
          className="mono inline-flex items-center px-3 py-1.5 rounded-full text-[11px] tracking-[0.1em] font-medium whitespace-nowrap"
          style={{ background: statusStyle.bg, color: statusStyle.color }}
        >
          {(ORG_STATUS_LABELS[full.status] ?? full.status).toUpperCase()}
        </span>
      </div>

      <form
        action={updateOrgAction}
        className="rounded-[20px] bg-white p-7 space-y-6"
        style={{ border: '1px solid var(--line)' }}
      >
        <Section title="IDENTIDADE">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field
              label="NOME *"
              name="name"
              defaultValue={full.name}
              required
            />
            <SelectField
              label="TIPO *"
              name="type"
              defaultValue={full.type}
              options={Object.entries(ORG_TYPE_LABELS).map(([v, l]) => ({
                value: v,
                label: l,
              }))}
              required
            />
            <Field label="CNPJ" name="cnpj" defaultValue={full.cnpj ?? ''} />
            <ColorField
              label="COR DA MARCA"
              name="brand_color"
              defaultValue={full.brand_color ?? '#2b2e8d'}
            />
          </div>
          <Field
            label="DESCRIÇÃO"
            name="description"
            defaultValue={full.description ?? ''}
            textarea
          />
        </Section>

        <Section title="CONTATO">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field
              label="EMAIL INSTITUCIONAL"
              name="email"
              type="email"
              defaultValue={full.email ?? ''}
            />
            <Field
              label="TELEFONE"
              name="phone"
              defaultValue={full.phone ?? ''}
            />
            <Field
              label="WEBSITE"
              name="website"
              defaultValue={full.website ?? ''}
              placeholder="https://..."
            />
            <Field
              label="LOGO URL"
              name="logo_url"
              defaultValue={full.logo_url ?? ''}
              placeholder="https://..."
            />
          </div>
        </Section>

        <div
          className="flex flex-wrap gap-3 pt-4"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <button type="submit" className="btn btn-orange btn-lg">
            Salvar alterações
          </button>
        </div>
      </form>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="mono text-[10px] tracking-[0.14em] mb-4"
        style={{ color: 'var(--ink-50)' }}
      >
        {title}
      </div>
      {children}
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
  textarea,
}: {
  label: string
  name: string
  defaultValue?: string
  placeholder?: string
  type?: string
  required?: boolean
  textarea?: boolean
}) {
  return (
    <label className="block">
      <span
        className="mono block text-[10px] tracking-[0.1em] mb-2"
        style={{ color: 'var(--ink-50)' }}
      >
        {label}
      </span>
      {textarea ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          rows={3}
          className="admin-textarea w-full px-4 py-3 rounded-xl text-sm"
        />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          className="admin-input w-full px-4 py-3 rounded-xl text-sm"
        />
      )}
    </label>
  )
}

function ColorField({
  label,
  name,
  defaultValue,
}: {
  label: string
  name: string
  defaultValue: string
}) {
  return (
    <label className="block">
      <span
        className="mono block text-[10px] tracking-[0.1em] mb-2"
        style={{ color: 'var(--ink-50)' }}
      >
        {label}
      </span>
      <div className="flex items-center gap-3">
        <input
          name={name}
          type="color"
          defaultValue={defaultValue}
          className="rounded-lg cursor-pointer"
          style={{
            width: 52,
            height: 44,
            border: '1px solid var(--line)',
            background: 'white',
          }}
        />
        <span
          className="mono text-xs"
          style={{ color: 'var(--ink-50)' }}
        >
          {defaultValue}
        </span>
      </div>
    </label>
  )
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
  required,
}: {
  label: string
  name: string
  defaultValue?: string
  options: { value: string; label: string }[]
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
      <select
        name={name}
        defaultValue={defaultValue ?? ''}
        required={required}
        className="admin-select w-full px-4 py-3 rounded-xl text-sm"
      >
        <option value="" disabled>
          Selecione...
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function Banner({
  color,
  children,
}: {
  color: 'success' | 'error'
  children: React.ReactNode
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
      className="mb-6 p-3 rounded-xl text-sm"
      style={{ background: styles.bg, border: styles.border, color: styles.color }}
    >
      {children}
    </div>
  )
}
