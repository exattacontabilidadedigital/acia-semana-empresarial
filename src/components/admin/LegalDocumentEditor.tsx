'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Plus, Trash2, ChevronUp, ChevronDown, Loader2, Eye, GripVertical } from 'lucide-react'
import { updateLegalDocumentAction } from '@/app/admin/legal/actions'

type SectionRow = {
  id: number | null  // null = new (não persistido ainda)
  number: string
  title: string
  body: string
  order_index: number
}

export type LegalDocumentEditorProps = {
  documentId: number
  slug: string
  publicPath: string
  initialDoc: {
    title: string
    eyebrow: string | null
    last_revision: string | null
    intro: string | null
  }
  initialSections: SectionRow[]
}

export default function LegalDocumentEditor({
  documentId,
  slug,
  publicPath,
  initialDoc,
  initialSections,
}: LegalDocumentEditorProps) {
  const [sections, setSections] = useState<SectionRow[]>(
    initialSections.length > 0
      ? initialSections
      : [{ id: null, number: '01', title: '', body: '', order_index: 1 }]
  )

  function updateSection(idx: number, patch: Partial<SectionRow>) {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  }

  function addSection() {
    const lastNum = sections.length
      ? Math.max(...sections.map((s) => Number(s.number) || 0))
      : 0
    const next = String(lastNum + 1).padStart(2, '0')
    setSections((prev) => [
      ...prev,
      {
        id: null,
        number: next,
        title: '',
        body: '<p></p>',
        order_index: prev.length + 1,
      },
    ])
  }

  function removeSection(idx: number) {
    if (!confirm('Remover esta seção?')) return
    setSections((prev) => prev.filter((_, i) => i !== idx))
  }

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir
    if (target < 0 || target >= sections.length) return
    setSections((prev) => {
      const copy = [...prev]
      const [item] = copy.splice(idx, 1)
      copy.splice(target, 0, item)
      return copy.map((s, i) => ({ ...s, order_index: i + 1 }))
    })
  }

  // Reordena order_index baseado na posição atual antes de submeter
  const sectionsForSubmit = sections.map((s, i) => ({
    ...s,
    order_index: i + 1,
  }))

  return (
    <form action={updateLegalDocumentAction} className="space-y-5">
      <input type="hidden" name="document_id" value={documentId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="sections" value={JSON.stringify(sectionsForSubmit)} />

      {/* Meta do documento */}
      <div
        className="rounded-[20px] bg-white p-7"
        style={{ border: '1px solid var(--line)' }}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <div
              className="mono text-[10px] tracking-[0.14em]"
              style={{ color: 'var(--ink-50)' }}
            >
              METADADOS DO DOCUMENTO
            </div>
            <h2
              className="display mt-1"
              style={{ fontSize: 22, letterSpacing: '-0.02em' }}
            >
              Cabeçalho
            </h2>
          </div>
          <a
            href={publicPath}
            target="_blank"
            rel="noopener noreferrer"
            className="mono text-[11px] tracking-[0.1em] inline-flex items-center gap-1 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--azul)' }}
          >
            <Eye size={12} /> VER PÚBLICO
          </a>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <Field
            label="TÍTULO *"
            name="title"
            defaultValue={initialDoc.title}
            required
          />
          <Field
            label="EYEBROW (LINHA SUPERIOR)"
            name="eyebrow"
            defaultValue={initialDoc.eyebrow ?? ''}
            placeholder="DOCUMENTOS LEGAIS"
          />
          <Field
            label="DATA DA ÚLTIMA REVISÃO (TEXTO)"
            name="last_revision"
            defaultValue={initialDoc.last_revision ?? ''}
            placeholder="15 de março de 2026"
          />
          <Field
            label="INTRODUÇÃO (OPCIONAL)"
            name="intro"
            defaultValue={initialDoc.intro ?? ''}
          />
        </div>
      </div>

      {/* Seções */}
      <div
        className="rounded-[20px] bg-white p-7"
        style={{ border: '1px solid var(--line)' }}
      >
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <div
              className="mono text-[10px] tracking-[0.14em]"
              style={{ color: 'var(--ink-50)' }}
            >
              {sections.length} SEÇÕES
            </div>
            <h2
              className="display mt-1"
              style={{ fontSize: 22, letterSpacing: '-0.02em' }}
            >
              Conteúdo
            </h2>
          </div>
          <button
            type="button"
            onClick={addSection}
            className="btn btn-ghost"
          >
            <Plus size={14} /> Adicionar seção
          </button>
        </div>

        <div className="space-y-4">
          {sections.map((s, idx) => (
            <div
              key={s.id ?? `new-${idx}`}
              className="rounded-xl p-4"
              style={{ border: '1px solid var(--line)', background: 'var(--paper)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <GripVertical
                  size={14}
                  style={{ color: 'var(--ink-50)' }}
                  className="shrink-0"
                />
                <input
                  type="text"
                  value={s.number}
                  onChange={(e) => updateSection(idx, { number: e.target.value })}
                  placeholder="01"
                  className="admin-input mono text-[11px] tracking-[0.06em] text-center"
                  style={{ width: 60, padding: '6px 8px', borderRadius: 8 }}
                />
                <input
                  type="text"
                  value={s.title}
                  onChange={(e) => updateSection(idx, { title: e.target.value })}
                  placeholder="Título da seção"
                  className="admin-input flex-1 px-3 py-2 rounded-lg text-sm font-semibold"
                />
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="rounded-md p-1.5 transition-colors hover:bg-paper-2 disabled:opacity-30"
                  style={{ color: 'var(--ink-50)' }}
                  title="Mover para cima"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === sections.length - 1}
                  className="rounded-md p-1.5 transition-colors hover:bg-paper-2 disabled:opacity-30"
                  style={{ color: 'var(--ink-50)' }}
                  title="Mover para baixo"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => removeSection(idx)}
                  className="rounded-md p-1.5 transition-colors hover:bg-paper-2"
                  style={{ color: '#b91c1c' }}
                  title="Remover seção"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <textarea
                value={s.body}
                onChange={(e) => updateSection(idx, { body: e.target.value })}
                rows={6}
                placeholder="<p>Conteúdo HTML...</p>"
                className="admin-textarea w-full px-3 py-2 rounded-lg text-xs mono"
                style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
              />
              <div
                className="mt-1 mono text-[10px] tracking-[0.06em]"
                style={{ color: 'var(--ink-50)' }}
              >
                HTML PERMITIDO: <code>p</code>, <code>strong</code>, <code>a href</code>,{' '}
                <code>ul/li</code>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ações */}
      <div
        className="sticky bottom-4 rounded-2xl bg-white p-4 flex items-center justify-between gap-3 shadow-lg"
        style={{ border: '1px solid var(--line)' }}
      >
        <div className="text-xs" style={{ color: 'var(--ink-50)' }}>
          {sections.length} seção(ões) prontas pra salvar
        </div>
        <SubmitButton />
      </div>
    </form>
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
      {pending ? (
        <>
          <Loader2 size={14} className="animate-spin" /> Salvando...
        </>
      ) : (
        'Salvar alterações'
      )}
    </button>
  )
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  required,
}: {
  label: string
  name: string
  defaultValue?: string
  placeholder?: string
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
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="admin-input w-full px-4 py-3 rounded-xl text-sm"
      />
    </label>
  )
}
