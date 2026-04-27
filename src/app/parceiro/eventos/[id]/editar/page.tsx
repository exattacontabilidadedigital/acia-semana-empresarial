import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ArrowLeft, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireActiveOrg } from '@/lib/orgs'
import { requirePermission } from '@/lib/permissions'
import { formatDateShort } from '@/lib/utils'

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

const STATUS_PILL: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'RASCUNHO' },
  pending_approval: { bg: 'rgba(248,130,30,0.15)', color: '#b85d00', label: 'PENDENTE' },
  active: { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a', label: 'PUBLICADO' },
  rejected: { bg: '#fee2e2', color: '#991b1b', label: 'REJEITADO' },
  archived: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'ARQUIVADO' },
  inactive: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'INATIVO' },
}

async function updateEventAction(formData: FormData) {
  'use server'
  const org = await requirePermission('manage_events')
  const id = Number(formData.get('id'))
  const action = String(formData.get('action') ?? 'save')

  const admin = createAdminClient()

  // Garante que o evento pertence à org
  const { data: ev } = await admin
    .from('events')
    .select('id, organization_id, status')
    .eq('id', id)
    .maybeSingle()
  if (!ev || ev.organization_id !== org.id) notFound()

  if (ev.status === 'active' && action !== 'archive') {
    redirect(
      `/parceiro/eventos/${id}/editar?error=${encodeURIComponent(
        'Eventos publicados só podem ser editados pelo administrador.'
      )}`
    )
  }

  if (action === 'archive') {
    await admin.from('events').update({ status: 'archived' }).eq('id', id)
    revalidatePath('/parceiro/eventos')
    redirect(`/parceiro/eventos/${id}/editar?archived=1`)
  }

  const patch: Record<string, any> = {
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
    updated_at: new Date().toISOString(),
  }

  if (action === 'submit') {
    patch.status = 'pending_approval'
    patch.submitted_at = new Date().toISOString()
    patch.rejection_reason = null
  }

  const { error } = await admin.from('events').update(patch).eq('id', id)
  if (error) {
    redirect(
      `/parceiro/eventos/${id}/editar?error=${encodeURIComponent(error.message)}`
    )
  }

  revalidatePath('/parceiro/eventos')
  revalidatePath(`/parceiro/eventos/${id}/editar`)
  redirect(`/parceiro/eventos/${id}/editar?${action === 'submit' ? 'submitted=1' : 'saved=1'}`)
}

export default async function EditarEventoPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: {
    error?: string
    saved?: string
    submitted?: string
    created?: string
    archived?: string
  }
}) {
  const org = await requireActiveOrg()
  const supabase = createServerSupabaseClient()
  const id = Number(params.id)

  const { data: ev } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!ev || ev.organization_id !== org.id) notFound()

  const status = STATUS_PILL[ev.status] ?? STATUS_PILL.draft
  const isPublished = ev.status === 'active'
  const isPending = ev.status === 'pending_approval'
  const isRejected = ev.status === 'rejected'

  return (
    <div className="page-enter max-w-3xl">
      <Link
        href="/parceiro/eventos"
        className="mono text-[11px] tracking-[0.14em] inline-flex items-center gap-1 mb-6 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--ink-50)' }}
      >
        <ArrowLeft size={12} /> VOLTAR
      </Link>

      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="eyebrow mb-4">
            <span className="dot" />
            PORTAL · EDITAR EVENTO
          </div>
          <h1
            className="display"
            style={{ fontSize: 'clamp(36px, 4.5vw, 48px)' }}
          >
            {ev.title}
          </h1>
        </div>
        <span
          className="mono inline-flex items-center px-3 py-1.5 rounded-full text-[11px] tracking-[0.1em] font-medium whitespace-nowrap"
          style={{ background: status.bg, color: status.color }}
        >
          {status.label}
        </span>
      </div>

      {/* Banners de feedback */}
      {searchParams.created && (
        <Banner color="success">
          Evento criado. Continue editando ou submeta para aprovação.
        </Banner>
      )}
      {searchParams.saved && <Banner color="success">Alterações salvas.</Banner>}
      {searchParams.submitted && (
        <Banner color="success">
          Submetido para aprovação. O administrador será notificado.
        </Banner>
      )}
      {searchParams.archived && (
        <Banner color="warning">Evento arquivado.</Banner>
      )}
      {searchParams.error && (
        <Banner color="error">{searchParams.error}</Banner>
      )}

      {/* Banners de estado */}
      {isPublished && (
        <Banner color="info" icon={<CheckCircle size={16} />}>
          Este evento está publicado em /inscricoes. Apenas o administrador pode
          editá-lo agora.
        </Banner>
      )}
      {isPending && (
        <Banner color="warning" icon={<Clock size={16} />}>
          Aguardando aprovação do administrador
          {ev.submitted_at
            ? ` desde ${formatDateShort(ev.submitted_at)}`
            : ''}
          .
        </Banner>
      )}
      {isRejected && ev.rejection_reason && (
        <Banner color="error" icon={<AlertTriangle size={16} />}>
          <strong>Rejeitado:</strong> {ev.rejection_reason}
          <br />
          Faça os ajustes necessários e submeta novamente.
        </Banner>
      )}

      <form
        action={updateEventAction}
        className="rounded-[20px] bg-white p-7 space-y-6"
        style={{ border: '1px solid var(--line)' }}
      >
        <input type="hidden" name="id" value={ev.id} />

        <Section title="INFORMAÇÕES BÁSICAS">
          <Field
            label="TÍTULO *"
            name="title"
            defaultValue={ev.title}
            required
            disabled={isPublished}
          />
          <Field
            label="DESCRIÇÃO *"
            name="description"
            textarea
            defaultValue={ev.description ?? ''}
            required
            disabled={isPublished}
          />
          <div className="grid sm:grid-cols-2 gap-5">
            <SelectField
              label="CATEGORIA *"
              name="category"
              options={CATEGORIES}
              defaultValue={ev.category}
              required
              disabled={isPublished}
            />
            <Field
              label="LOCAL"
              name="location"
              defaultValue={ev.location ?? ''}
              disabled={isPublished}
            />
          </div>
        </Section>

        <Section title="DATA E HORÁRIO">
          <div className="grid sm:grid-cols-3 gap-5">
            <Field
              label="DATA *"
              name="event_date"
              type="date"
              defaultValue={ev.event_date}
              required
              disabled={isPublished}
            />
            <Field
              label="INÍCIO *"
              name="start_time"
              type="time"
              defaultValue={ev.start_time?.slice(0, 5)}
              required
              disabled={isPublished}
            />
            <Field
              label="TÉRMINO"
              name="end_time"
              type="time"
              defaultValue={ev.end_time?.slice(0, 5) ?? ''}
              disabled={isPublished}
            />
          </div>
        </Section>

        <Section title="VAGAS E PREÇO">
          <div className="grid sm:grid-cols-3 gap-5">
            <Field
              label="CAPACIDADE"
              name="capacity"
              type="number"
              defaultValue={String(ev.capacity ?? 0)}
              disabled={isPublished}
            />
            <Field
              label="PREÇO INTEIRO (R$)"
              name="price"
              type="number"
              step="0.01"
              defaultValue={String(ev.price ?? 0)}
              disabled={isPublished}
            />
            <Field
              label="MEIA-ENTRADA (R$)"
              name="half_price"
              type="number"
              step="0.01"
              defaultValue={String(ev.half_price ?? 0)}
              disabled={isPublished}
            />
          </div>
        </Section>

        <Section title="IMAGEM">
          <Field
            label="URL DA IMAGEM"
            name="image_url"
            defaultValue={ev.image_url ?? ''}
            placeholder="https://..."
            disabled={isPublished}
          />
        </Section>

        <div
          className="flex flex-wrap gap-3 pt-4"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          {!isPublished && (
            <button
              type="submit"
              name="action"
              value="save"
              className="btn btn-ghost btn-lg"
            >
              Salvar alterações
            </button>
          )}
          {!isPublished && !isPending && (
            <button
              type="submit"
              name="action"
              value="submit"
              className="btn btn-orange btn-lg"
            >
              {isRejected ? 'Submeter novamente' : 'Submeter para aprovação'}
            </button>
          )}
          {ev.status !== 'archived' && (
            <button
              type="submit"
              name="action"
              value="archive"
              className="btn btn-ghost btn-lg"
              style={{ marginLeft: 'auto' }}
            >
              Arquivar
            </button>
          )}
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
  disabled,
}: {
  label: string
  name: string
  defaultValue?: string
  placeholder?: string
  type?: string
  step?: string
  required?: boolean
  textarea?: boolean
  disabled?: boolean
}) {
  const opacity = disabled ? 0.7 : 1
  return (
    <label className="block" style={{ opacity }}>
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
          disabled={disabled}
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
          disabled={disabled}
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
  defaultValue,
  required,
  disabled,
}: {
  label: string
  name: string
  options: { value: string; label: string }[]
  defaultValue?: string
  required?: boolean
  disabled?: boolean
}) {
  return (
    <label className="block" style={disabled ? { opacity: 0.7 } : undefined}>
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
        disabled={disabled}
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
  icon,
  children,
}: {
  color: 'success' | 'error' | 'warning' | 'info'
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  const map = {
    success: {
      bg: 'rgba(166,206,58,0.10)',
      border: '1px solid rgba(166,206,58,0.4)',
      color: '#3d5a0a',
    },
    error: { bg: '#fff1f2', border: '1px solid #fecdd3', color: '#b91c1c' },
    warning: {
      bg: 'rgba(248,130,30,0.08)',
      border: '1px solid rgba(248,130,30,0.3)',
      color: '#b85d00',
    },
    info: { bg: 'var(--azul-50)', border: '1px solid var(--line)', color: 'var(--azul-900)' },
  }
  const s = map[color]
  return (
    <div
      className="mb-5 p-3 rounded-xl text-sm flex items-start gap-2"
      style={{ background: s.bg, border: s.border, color: s.color }}
    >
      {icon && <span className="shrink-0 mt-0.5">{icon}</span>}
      <div className="min-w-0">{children}</div>
    </div>
  )
}
