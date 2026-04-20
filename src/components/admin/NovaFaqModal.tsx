'use client'

import { useEffect, useState } from 'react'
import { createPortal, useFormStatus } from 'react-dom'
import { Plus, X } from 'lucide-react'
import { createFaqAction } from '@/app/admin/chat-conhecimento/actions'

const CATEGORY_OPTIONS = [
  { value: 'faq', label: 'FAQ Geral' },
  { value: 'venue', label: 'Local / Venue' },
  { value: 'policy', label: 'Políticas' },
  { value: 'how_it_works', label: 'Como Funciona' },
  { value: 'other', label: 'Outros' },
]

export default function NovaFaqModal() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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
              CONHECIMENTO · NOVA FAQ
            </div>
            <h2 className="display" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>
              Adicionar à base de conhecimento
            </h2>
            <p
              className="text-sm mt-2"
              style={{ color: 'var(--ink-70)', maxWidth: 460 }}
            >
              Assim que salvar, a assistente Aci já considera esta resposta nos
              chats.
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
        <form action={createFaqAction} className="p-7 space-y-5">
          <Field label="CATEGORIA *">
            <select
              name="category"
              defaultValue="faq"
              required
              className="admin-select w-full px-4 py-3 rounded-xl text-sm"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="PERGUNTA *">
            <input
              name="question"
              required
              placeholder="Ex: Posso ir de moto?"
              className="admin-input w-full px-4 py-3 rounded-xl text-sm"
            />
          </Field>

          <Field label="RESPOSTA *">
            <textarea
              name="answer"
              rows={6}
              required
              placeholder="Resposta direta. Markdown simples suportado (**negrito**, listas com -)."
              className="admin-textarea w-full px-4 py-3 rounded-xl text-sm"
            />
          </Field>

          <Field label="PALAVRAS-CHAVE (opcional, separadas por vírgula)">
            <input
              name="keywords"
              placeholder="moto, transporte, estacionamento"
              className="admin-input w-full px-4 py-3 rounded-xl text-sm"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="ORDEM">
              <input
                name="order_index"
                type="number"
                defaultValue={0}
                className="admin-input w-full px-4 py-3 rounded-xl text-sm"
              />
            </Field>
            <Field label="STATUS">
              <label className="flex items-center gap-2 mt-3">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked
                  className="w-4 h-4"
                />
                <span className="text-sm">Ativo</span>
              </label>
            </Field>
          </div>

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
        <Plus size={16} /> Novo conhecimento
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
      {pending ? 'Salvando...' : 'Salvar'}
    </button>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span
        className="mono block text-[10px] tracking-[0.1em] mb-2"
        style={{ color: 'var(--ink-50)' }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}
