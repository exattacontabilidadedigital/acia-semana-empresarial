import Link from 'next/link'
import { Save, Trash2 } from 'lucide-react'
import {
  saveCertificateTemplateAction,
  deleteCertificateTemplateAction,
} from '@/app/admin/certificados/actions'
import TemplatePreviewButton from '@/components/admin/TemplatePreviewButton'
import TemplateBackgroundField from '@/components/admin/TemplateBackgroundField'

type Template = {
  id: number
  name: string
  event_id: number | null
  header_text: string
  body_text: string
  footer_text: string | null
  logo_url: string | null
  background_url: string | null
  duration_hours: number | null
}

type EventOption = {
  id: number
  title: string
  event_date: string
}

type Signature = {
  id: number
  name: string
  role: string | null
  organization: string | null
  active: boolean
}

export default function CertificateTemplateForm({
  template,
  events,
  signatures,
  linkedSignatureIds,
}: {
  template?: Template | null
  events: EventOption[]
  signatures: Signature[]
  linkedSignatureIds: Set<number>
}) {
  return (
    <form
      action={saveCertificateTemplateAction}
      className="rounded-2xl bg-white p-7 space-y-5"
      style={{ border: '1px solid var(--line)' }}
    >
      {template && <input type="hidden" name="id" value={template.id} />}

      <Field
        label="NOME"
        name="name"
        defaultValue={template?.name ?? 'Template'}
        required
      />

      <label className="block">
        <span
          className="mono block text-[10px] tracking-[0.1em] mb-2"
          style={{ color: 'var(--ink-50)' }}
        >
          EVENTO (deixe vazio pra ser o template padrão)
        </span>
        <select
          name="event_id"
          defaultValue={template?.event_id ?? ''}
          className="admin-select w-full px-4 py-3 rounded-xl text-sm"
        >
          <option value="">— Padrão (fallback) —</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.event_date} · {e.title}
            </option>
          ))}
        </select>
      </label>

      <Field
        label="CABEÇALHO"
        name="header_text"
        defaultValue={template?.header_text ?? 'Certificado de Participação'}
      />

      <Field
        label="CORPO (placeholders: {nome}, {evento}, {data}, {duracao}, {codigo})"
        name="body_text"
        textarea
        rows={4}
        defaultValue={
          template?.body_text ??
          'Certificamos que {nome} participou do evento "{evento}", realizado em {data}, com carga horária de {duracao}h.'
        }
      />

      <Field
        label="RODAPÉ (opcional)"
        name="footer_text"
        textarea
        rows={2}
        defaultValue={template?.footer_text ?? ''}
        placeholder="Ex: Açailândia, MA"
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          label="LOGO (URL)"
          name="logo_url"
          defaultValue={template?.logo_url ?? ''}
          placeholder="https://..."
        />
        <Field
          label="CARGA HORÁRIA (override)"
          name="duration_hours"
          type="number"
          step="0.5"
          defaultValue={
            template?.duration_hours != null
              ? String(template.duration_hours)
              : ''
          }
          placeholder="Vazio = usa do evento"
        />
      </div>

      <TemplateBackgroundField defaultUrl={template?.background_url ?? null} />

      <div>
        <span
          className="mono block text-[10px] tracking-[0.1em] mb-2"
          style={{ color: 'var(--ink-50)' }}
        >
          ASSINATURAS QUE APARECEM NESTE CERTIFICADO
        </span>
        {signatures.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--ink-70)' }}>
            Nenhuma assinatura cadastrada.{' '}
            <Link
              href="/admin/configuracoes/assinaturas"
              style={{ color: 'var(--azul)' }}
            >
              Cadastrar agora →
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            {signatures.map((s) => (
              <label
                key={s.id}
                className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-paper-2 transition-colors"
                style={{ border: '1px solid var(--line)' }}
              >
                <input
                  type="checkbox"
                  name="signature_ids"
                  value={s.id}
                  defaultChecked={linkedSignatureIds.has(s.id)}
                />
                <div className="flex-1 text-sm">
                  <div className="font-semibold">{s.name}</div>
                  <div
                    className="text-xs"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    {[s.role, s.organization].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <div
        className="flex flex-wrap items-center gap-3 pt-4"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <button type="submit" className="btn btn-orange btn-lg">
          <Save size={14} /> Salvar template
        </button>
        <TemplatePreviewButton />
        {template && template.event_id && (
          <button
            formAction={deleteCertificateTemplateAction}
            className="btn btn-ghost btn-lg"
            style={{ color: '#b91c1c' }}
          >
            <Trash2 size={14} /> Excluir
          </button>
        )}
      </div>
    </form>
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
  rows,
}: {
  label: string
  name: string
  defaultValue?: string
  placeholder?: string
  type?: string
  step?: string
  required?: boolean
  textarea?: boolean
  rows?: number
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
          rows={rows ?? 3}
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
