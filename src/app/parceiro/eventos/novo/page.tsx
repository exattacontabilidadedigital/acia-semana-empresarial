import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ArrowLeft } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireActiveOrg } from '@/lib/orgs'

export const dynamic = 'force-dynamic'

const CATEGORIES = [
  { value: 'palestra', label: 'Palestra' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'rodada', label: 'Rodada de Negócios' },
  { value: 'feira', label: 'Feira' },
  { value: 'curso', label: 'Curso' },
  { value: 'consultoria', label: 'Consultoria' },
  { value: 'outro', label: 'Outro' },
]

async function createEventAction(formData: FormData) {
  'use server'
  const org = await requireActiveOrg()
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const submit = formData.get('action') === 'submit'

  const payload: Record<string, any> = {
    organization_id: org.id,
    owner_id: user.id,
    title: String(formData.get('title') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim(),
    category: String(formData.get('category') ?? '').trim(),
    event_date: String(formData.get('event_date') ?? '').trim(),
    start_time: String(formData.get('start_time') ?? '').trim(),
    end_time: String(formData.get('end_time') ?? '').trim() || null,
    location: String(formData.get('location') ?? '').trim() || null,
    capacity: Number(formData.get('capacity') ?? 0) || 0,
    price: Number(formData.get('price') ?? 0) || 0,
    half_price: Number(formData.get('half_price') ?? 0) || 0,
    image_url: String(formData.get('image_url') ?? '').trim() || null,
    status: submit ? 'pending_approval' : 'draft',
    submitted_at: submit ? new Date().toISOString() : null,
  }

  if (!payload.title || !payload.description || !payload.category || !payload.event_date || !payload.start_time) {
    redirect(
      `/parceiro/eventos/novo?error=${encodeURIComponent(
        'Título, descrição, categoria, data e horário inicial são obrigatórios.'
      )}`
    )
  }

  const admin = createAdminClient()
  const { data: created, error } = await admin
    .from('events')
    .insert(payload)
    .select('id')
    .single()

  if (error || !created) {
    redirect(
      `/parceiro/eventos/novo?error=${encodeURIComponent(error?.message ?? 'Falha ao criar evento.')}`
    )
  }

  revalidatePath('/parceiro/eventos')
  redirect(`/parceiro/eventos/${created.id}/editar?created=1`)
}

export default function NovoEventoPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="page-enter max-w-3xl">
      <Link
        href="/parceiro/eventos"
        className="mono text-[11px] tracking-[0.14em] inline-flex items-center gap-1 mb-6 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--ink-50)' }}
      >
        <ArrowLeft size={12} /> VOLTAR
      </Link>

      <div className="mb-10">
        <div className="eyebrow mb-4">
          <span className="dot" />
          PORTAL · NOVO EVENTO
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
          Cadastrar evento
        </h1>
        <p
          className="mt-3"
          style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
        >
          Salve como rascunho para continuar editando ou submeta direto para
          aprovação do administrador.
        </p>
      </div>

      {searchParams.error && (
        <div
          className="mb-6 p-3 rounded-xl text-sm"
          style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#b91c1c',
          }}
        >
          {searchParams.error}
        </div>
      )}

      <form
        action={createEventAction}
        className="rounded-[20px] bg-white p-7 space-y-6"
        style={{ border: '1px solid var(--line)' }}
      >
        <Section title="INFORMAÇÕES BÁSICAS">
          <Field label="TÍTULO *" name="title" required />
          <Field
            label="DESCRIÇÃO *"
            name="description"
            textarea
            required
          />
          <div className="grid sm:grid-cols-2 gap-5">
            <SelectField
              label="CATEGORIA *"
              name="category"
              options={CATEGORIES}
              required
            />
            <Field label="LOCAL" name="location" placeholder="Ex: Sala 101 — ACIA" />
          </div>
        </Section>

        <Section title="DATA E HORÁRIO">
          <div className="grid sm:grid-cols-3 gap-5">
            <Field label="DATA *" name="event_date" type="date" required />
            <Field label="INÍCIO *" name="start_time" type="time" required />
            <Field label="TÉRMINO" name="end_time" type="time" />
          </div>
        </Section>

        <Section title="VAGAS E PREÇO">
          <div className="grid sm:grid-cols-3 gap-5">
            <Field
              label="CAPACIDADE"
              name="capacity"
              type="number"
              defaultValue="0"
              placeholder="0 = ilimitado"
            />
            <Field
              label="PREÇO INTEIRO (R$)"
              name="price"
              type="number"
              step="0.01"
              defaultValue="0"
            />
            <Field
              label="MEIA-ENTRADA (R$)"
              name="half_price"
              type="number"
              step="0.01"
              defaultValue="0"
            />
          </div>
        </Section>

        <Section title="IMAGEM">
          <Field
            label="URL DA IMAGEM"
            name="image_url"
            placeholder="https://..."
          />
          <p
            className="text-xs mt-2"
            style={{ color: 'var(--ink-50)' }}
          >
            Cole o link público da imagem (recomendado: 1200×630). Suporte a
            upload direto será adicionado em breve.
          </p>
        </Section>

        <div
          className="flex flex-wrap gap-3 pt-4"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <button
            type="submit"
            name="action"
            value="draft"
            className="btn btn-ghost btn-lg"
          >
            Salvar rascunho
          </button>
          <button
            type="submit"
            name="action"
            value="submit"
            className="btn btn-orange btn-lg"
          >
            Salvar e submeter para aprovação
          </button>
          <Link href="/parceiro/eventos" className="btn btn-ghost btn-lg">
            Cancelar
          </Link>
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
      <div className="space-y-5">{children}</div>
    </div>
  )
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = 'text',
  step,
  required,
  textarea,
}: {
  label: string
  name: string
  defaultValue?: string
  placeholder?: string
  type?: string
  step?: string
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
          rows={4}
          className="admin-textarea w-full px-4 py-3 rounded-xl text-sm"
        />
      ) : (
        <input
          name={name}
          type={type}
          step={step}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          className="admin-input w-full px-4 py-3 rounded-xl text-sm"
        />
      )}
    </label>
  )
}

function SelectField({
  label,
  name,
  options,
  required,
  defaultValue,
}: {
  label: string
  name: string
  options: { value: string; label: string }[]
  required?: boolean
  defaultValue?: string
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
