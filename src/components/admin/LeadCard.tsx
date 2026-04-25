'use client'

import { useState, useTransition } from 'react'
import {
  Mail,
  Phone,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Trash2,
  Loader2,
  StickyNote,
} from 'lucide-react'
import {
  updateLeadStatusAction,
  updateLeadNotesAction,
  deleteLeadAction,
} from '@/app/admin/leads-patrocinio/actions'

type Lead = {
  id: number
  name: string
  company: string
  email: string
  phone: string | null
  tier: string | null
  message: string | null
  status: string
  notes: string | null
  created_at: string
  contacted_at: string | null
}

const STATUS_PILL: Record<string, { bg: string; color: string; label: string }> = {
  new: { bg: 'rgba(248,130,30,0.18)', color: '#b85d00', label: 'NOVO' },
  contacted: { bg: 'rgba(43,46,141,0.12)', color: '#2b2e8d', label: 'CONTATADO' },
  qualified: { bg: 'rgba(26,164,191,0.18)', color: '#0a6f81', label: 'QUALIFICADO' },
  closed: { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a', label: 'FECHADO' },
  discarded: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'DESCARTADO' },
}

const TIER_LABELS: Record<string, string> = {
  master: 'Master',
  diamante: 'Diamante',
  ouro: 'Ouro',
  prata: 'Prata',
  bronze: 'Bronze',
  apoio: 'Apoio',
}

export default function LeadCard({ lead }: { lead: Lead }) {
  const [expanded, setExpanded] = useState(lead.status === 'new')
  const [editingNotes, setEditingNotes] = useState(false)
  const [pending, startTransition] = useTransition()
  const status = STATUS_PILL[lead.status] ?? STATUS_PILL.new

  const formattedDate = new Date(lead.created_at).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  function handleStatusChange(newStatus: string) {
    const fd = new FormData()
    fd.append('id', String(lead.id))
    fd.append('status', newStatus)
    startTransition(async () => {
      await updateLeadStatusAction(fd)
    })
  }

  function handleDelete() {
    if (!window.confirm(`Excluir lead de ${lead.company}? Não há como desfazer.`)) return
    const fd = new FormData()
    fd.append('id', String(lead.id))
    startTransition(async () => {
      await deleteLeadAction(fd)
    })
  }

  return (
    <div
      className="rounded-xl bg-white"
      style={{ border: '1px solid var(--line)' }}
    >
      {/* Cabeçalho */}
      <div className="p-4 flex items-start justify-between gap-4 flex-wrap">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 min-w-0 text-left bg-transparent border-none p-0 cursor-pointer"
        >
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className="mono inline-flex items-center px-2 py-0.5 rounded-full text-[10px] tracking-[0.08em] font-medium"
              style={{ background: status.bg, color: status.color }}
            >
              {status.label}
            </span>
            {lead.tier && (
              <span
                className="mono text-[10px] tracking-[0.08em] px-2 py-0.5 rounded-full"
                style={{ background: 'var(--paper-2)', color: 'var(--ink-70)' }}
              >
                {(TIER_LABELS[lead.tier] ?? lead.tier).toUpperCase()}
              </span>
            )}
            <span
              className="mono text-[10px] tracking-[0.06em] inline-flex items-center gap-1"
              style={{ color: 'var(--ink-50)' }}
            >
              <Calendar size={11} /> {formattedDate}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="font-semibold" style={{ color: 'var(--ink)' }}>
              {lead.company}
            </div>
            <div className="text-xs" style={{ color: 'var(--ink-70)' }}>
              {lead.name}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`mailto:${lead.email}`}
            className="mono text-[10px] tracking-[0.08em] inline-flex items-center gap-1 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--azul)' }}
            title={lead.email}
          >
            <Mail size={12} /> E-MAIL
          </a>
          {lead.phone && (
            <a
              href={`tel:${lead.phone.replace(/\D/g, '')}`}
              className="mono text-[10px] tracking-[0.08em] inline-flex items-center gap-1 hover:opacity-70 transition-opacity"
              style={{ color: 'var(--verde-600)' }}
              title={lead.phone}
            >
              <Phone size={12} /> LIGAR
            </a>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-md p-1.5"
            style={{
              background: 'white',
              border: '1px solid var(--line)',
              color: 'var(--ink-50)',
            }}
            title={expanded ? 'Recolher' : 'Expandir'}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Detalhes (expandido) */}
      {expanded && (
        <div
          className="px-4 pb-4 pt-0 space-y-4"
          style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}
        >
          {/* Dados de contato */}
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div>
              <div
                className="mono text-[10px] tracking-[0.1em] mb-1"
                style={{ color: 'var(--ink-50)' }}
              >
                E-MAIL
              </div>
              <a
                href={`mailto:${lead.email}`}
                style={{ color: 'var(--azul)' }}
                className="break-all hover:underline"
              >
                {lead.email}
              </a>
            </div>
            {lead.phone && (
              <div>
                <div
                  className="mono text-[10px] tracking-[0.1em] mb-1"
                  style={{ color: 'var(--ink-50)' }}
                >
                  TELEFONE
                </div>
                <span style={{ color: 'var(--ink)' }}>{lead.phone}</span>
              </div>
            )}
            <div>
              <div
                className="mono text-[10px] tracking-[0.1em] mb-1"
                style={{ color: 'var(--ink-50)' }}
              >
                EMPRESA
              </div>
              <span
                className="inline-flex items-center gap-1"
                style={{ color: 'var(--ink)' }}
              >
                <Building2 size={12} /> {lead.company}
              </span>
            </div>
          </div>

          {/* Mensagem */}
          {lead.message && (
            <div>
              <div
                className="mono text-[10px] tracking-[0.1em] mb-1"
                style={{ color: 'var(--ink-50)' }}
              >
                MENSAGEM
              </div>
              <div
                className="text-sm whitespace-pre-wrap rounded-lg p-3"
                style={{
                  background: 'var(--paper-2)',
                  color: 'var(--ink)',
                }}
              >
                {lead.message}
              </div>
            </div>
          )}

          {/* Anotação interna */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div
                className="mono text-[10px] tracking-[0.1em] inline-flex items-center gap-1"
                style={{ color: 'var(--ink-50)' }}
              >
                <StickyNote size={11} /> ANOTAÇÃO INTERNA
              </div>
              {!editingNotes && (
                <button
                  type="button"
                  onClick={() => setEditingNotes(true)}
                  className="mono text-[10px] tracking-[0.08em]"
                  style={{ color: 'var(--azul)' }}
                >
                  EDITAR
                </button>
              )}
            </div>
            {editingNotes ? (
              <form
                action={updateLeadNotesAction}
                onSubmit={() => setEditingNotes(false)}
                className="space-y-2"
              >
                <input type="hidden" name="id" value={lead.id} />
                <textarea
                  name="notes"
                  defaultValue={lead.notes ?? ''}
                  rows={3}
                  className="admin-textarea w-full px-3 py-2 rounded-lg text-sm"
                  placeholder="Quem ligou, próximos passos, valor proposto, etc."
                />
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-orange btn-sm">
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingNotes(false)}
                    className="btn btn-ghost btn-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div
                className="text-sm whitespace-pre-wrap rounded-lg p-3 min-h-[44px]"
                style={{
                  background: 'var(--paper-2)',
                  color: lead.notes ? 'var(--ink)' : 'var(--ink-50)',
                  fontStyle: lead.notes ? 'normal' : 'italic',
                }}
              >
                {lead.notes ?? 'Sem anotações.'}
              </div>
            )}
          </div>

          {/* Ações de status */}
          <div
            className="pt-3 flex flex-wrap items-center gap-2"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <span
              className="mono text-[10px] tracking-[0.1em] mr-1"
              style={{ color: 'var(--ink-50)' }}
            >
              MUDAR STATUS:
            </span>
            {Object.entries(STATUS_PILL).map(([key, p]) => (
              <button
                key={key}
                type="button"
                disabled={pending || lead.status === key}
                onClick={() => handleStatusChange(key)}
                className="mono text-[10px] tracking-[0.08em] px-2.5 py-1 rounded-full transition-opacity"
                style={{
                  background: lead.status === key ? p.bg : 'white',
                  color: lead.status === key ? p.color : 'var(--ink-70)',
                  border:
                    lead.status === key
                      ? '1px solid ' + p.color
                      : '1px solid var(--line)',
                  opacity: lead.status === key ? 1 : pending ? 0.5 : 1,
                  cursor: lead.status === key ? 'default' : 'pointer',
                }}
              >
                {p.label}
              </button>
            ))}
            <div className="flex-1" />
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="mono text-[10px] tracking-[0.08em] px-2.5 py-1 rounded-full inline-flex items-center gap-1"
              style={{
                background: 'white',
                border: '1px solid #fecdd3',
                color: '#b91c1c',
              }}
              title="Excluir lead"
            >
              {pending ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Trash2 size={11} />
              )}
              EXCLUIR
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
