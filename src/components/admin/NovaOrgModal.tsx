'use client'

import { useEffect, useState } from 'react'
import { createPortal, useFormStatus } from 'react-dom'
import { Plus, X } from 'lucide-react'
import { createOrganizationAction } from '@/app/admin/parceiros/actions'
import { ORG_TYPE_LABELS } from '@/lib/org-types'

export default function NovaOrgModal() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fecha com ESC + bloqueia scroll do body
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const overlay = open ? (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ background: 'rgba(10,12,40,0.55)' }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-[20px] bg-white my-4"
        style={{
          border: '1px solid var(--line)',
          boxShadow: '0 30px 60px -20px rgba(20,20,60,0.35)',
        }}
      >
            {/* Header */}
            <div
              className="flex items-start justify-between gap-3 p-7 pb-4"
              style={{ borderBottom: '1px solid var(--line)' }}
            >
              <div className="min-w-0">
                <div
                  className="mono text-[10px] tracking-[0.14em] mb-2"
                  style={{ color: 'var(--ink-50)' }}
                >
                  PARCEIROS · NOVA ORGANIZAÇÃO
                </div>
                <h2
                  className="display"
                  style={{ fontSize: 26, letterSpacing: '-0.02em' }}
                >
                  Cadastrar parceiro
                </h2>
                <p
                  className="text-sm mt-2"
                  style={{ color: 'var(--ink-70)', maxWidth: 460 }}
                >
                  O owner recebe um link mágico por email pra ativar o portal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="rounded-lg p-2 transition-colors hover:bg-paper-2"
                style={{ color: 'var(--ink-50)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form action={createOrganizationAction} className="p-7 space-y-6">
              <Section title="DADOS DA ORGANIZAÇÃO">
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field
                    label="NOME *"
                    name="name"
                    placeholder="Ex: SEBRAE Maranhão"
                    required
                  />
                  <SelectField
                    label="TIPO *"
                    name="type"
                    required
                    options={Object.entries(ORG_TYPE_LABELS).map(([v, l]) => ({
                      value: v,
                      label: l,
                    }))}
                  />
                  <Field label="CNPJ" name="cnpj" placeholder="00.000.000/0000-00" />
                  <Field
                    label="EMAIL INSTITUCIONAL"
                    name="email"
                    type="email"
                    placeholder="contato@org.com"
                  />
                  <Field label="TELEFONE" name="phone" placeholder="(99) 99999-9999" />
                  <Field label="WEBSITE" name="website" placeholder="https://..." />
                </div>
                <Field
                  label="DESCRIÇÃO"
                  name="description"
                  textarea
                  placeholder="Breve apresentação da organização (opcional)"
                />
              </Section>

              <Section title="OWNER (RESPONSÁVEL)">
                <p
                  className="text-xs mb-3 -mt-3"
                  style={{ color: 'var(--ink-70)' }}
                >
                  Owner gerencia equipe + dados da org + eventos. Receberá email
                  com link mágico para definir senha.
                </p>
                <Field
                  label="EMAIL DO OWNER *"
                  name="owner_email"
                  type="email"
                  placeholder="responsavel@org.com"
                  required
                />
              </Section>

              <div
                className="flex flex-wrap gap-3 pt-4"
                style={{ borderTop: '1px solid var(--line)' }}
              >
                <SubmitButton />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn btn-ghost btn-lg"
                >
                  Cancelar
                </button>
              </div>
            </form>
      </div>
    </div>
  ) : null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-orange btn-lg shrink-0"
      >
        <Plus size={16} /> Nova organização
      </button>
      {mounted && overlay ? createPortal(overlay, document.body) : null}
    </>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-orange btn-lg"
      style={pending ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
    >
      {pending ? 'Criando...' : 'Criar e enviar convite'}
    </button>
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
  placeholder,
  type = 'text',
  required,
  textarea,
}: {
  label: string
  name: string
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
          placeholder={placeholder}
          required={required}
          rows={3}
          className="admin-textarea w-full px-4 py-3 rounded-xl text-sm"
        />
      ) : (
        <input
          name={name}
          type={type}
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
}: {
  label: string
  name: string
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
        required={required}
        defaultValue=""
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
