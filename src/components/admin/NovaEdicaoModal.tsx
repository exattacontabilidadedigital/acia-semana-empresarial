'use client'

import { useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Plus, X } from 'lucide-react'
import ModalPortal from '@/components/ui/ModalPortal'
import { createEditionAction } from '@/app/admin/edicoes/actions'

export default function NovaEdicaoModal() {
  const [open, setOpen] = useState(false)

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-orange btn-lg shrink-0"
      >
        <Plus size={16} /> Nova edição
      </button>

      {open && (
        <ModalPortal>
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
              <div
                className="flex items-start justify-between gap-3 p-7 pb-4"
                style={{ borderBottom: '1px solid var(--line)' }}
              >
                <div className="min-w-0">
                  <div
                    className="mono text-[10px] tracking-[0.14em] mb-2"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    EDIÇÕES · NOVA
                  </div>
                  <h2 className="display" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>
                    Cadastrar edição
                  </h2>
                  <p
                    className="text-sm mt-2"
                    style={{ color: 'var(--ink-70)', maxWidth: 460 }}
                  >
                    Preencha o essencial agora — você adiciona capa, números e
                    galeria depois pela tela de detalhe.
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

              <form action={createEditionAction} className="p-7 space-y-5">
                <div className="grid sm:grid-cols-[120px_120px_1fr] gap-4">
                  <Field label="ANO *" name="year" type="number" required placeholder="2026" />
                  <Field label="ORDINAL" name="ordinal" placeholder="6ª" />
                  <Field label="TÍTULO *" name="title" required placeholder="Ex: A semana que move Açailândia" />
                </div>
                <Field
                  label="DESCRIÇÃO"
                  name="description"
                  textarea
                  placeholder="Frase curta de uma linha"
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field
                    label="COR DE DESTAQUE"
                    name="color"
                    placeholder="var(--azul) ou #2b2e8d"
                  />
                  <Field
                    label="ORDEM (menor = primeiro)"
                    name="order_index"
                    type="number"
                    placeholder="0"
                  />
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
        </ModalPortal>
      )}
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
      {pending ? 'Criando...' : 'Criar edição'}
    </button>
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
          rows={2}
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
