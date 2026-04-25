'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, X, Loader2 } from 'lucide-react'
import { deleteSignatureAction } from '@/app/admin/certificados/actions'
import SignatureForm from './SignatureForm'

type Signature = {
  id: number
  name: string
  role: string | null
  organization: string | null
  signature_image_url: string | null
  organization_logo_url: string | null
  display_order: number | null
  active: boolean
}

export default function SignatureCard({ signature }: { signature: Signature }) {
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm(`Excluir assinatura "${signature.name}"?`)) return
    const fd = new FormData()
    fd.append('id', String(signature.id))
    startTransition(async () => {
      await deleteSignatureAction(fd)
    })
  }

  if (editing) {
    return (
      <div
        className="rounded-xl bg-paper-2 p-4"
        style={{ border: '1px solid var(--line)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <span
            className="mono text-[10px] tracking-[0.14em]"
            style={{ color: 'var(--ink-50)' }}
          >
            EDITANDO
          </span>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md p-1"
            style={{ color: 'var(--ink-50)' }}
          >
            <X size={14} />
          </button>
        </div>
        <SignatureForm
          signature={signature}
          onSaved={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <div
      className="rounded-xl bg-white p-4 flex items-center gap-4"
      style={{ border: '1px solid var(--line)' }}
    >
      {signature.signature_image_url && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={signature.signature_image_url}
          alt=""
          className="rounded-md"
          style={{
            width: 80,
            height: 40,
            objectFit: 'contain',
            background: '#f8f8f8',
          }}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold" style={{ color: 'var(--ink)' }}>
            {signature.name}
          </span>
          {!signature.active && (
            <span
              className="mono text-[9px] tracking-[0.08em] px-2 py-0.5 rounded-full"
              style={{ background: 'var(--paper-2)', color: 'var(--ink-50)' }}
            >
              INATIVA
            </span>
          )}
        </div>
        <div className="text-xs" style={{ color: 'var(--ink-70)' }}>
          {[signature.role, signature.organization].filter(Boolean).join(' · ') ||
            '—'}
        </div>
      </div>
      {signature.organization_logo_url && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={signature.organization_logo_url}
          alt=""
          className="rounded-md"
          style={{
            width: 50,
            height: 30,
            objectFit: 'contain',
            background: '#f8f8f8',
          }}
        />
      )}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md p-1.5"
          style={{
            background: 'white',
            border: '1px solid var(--line)',
            color: 'var(--ink-50)',
          }}
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="rounded-md p-1.5"
          style={{
            background: 'white',
            border: '1px solid var(--line)',
            color: '#b91c1c',
          }}
        >
          {pending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Trash2 size={13} />
          )}
        </button>
      </div>
    </div>
  )
}
