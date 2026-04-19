'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Pencil, Trash2, X, Star, Loader2 } from 'lucide-react'
import { updatePhotoAction, deletePhotoAction } from '@/app/admin/galeria/actions'

type Edition = { id: number; year: number; title: string }
type Photo = {
  id: number
  url: string
  caption: string | null
  alt: string | null
  edition_id: number | null
  size_hint: string | null
  order_index: number | null
  featured: boolean
}

export default function PhotoEditCard({
  photo,
  editions,
}: {
  photo: Photo
  editions: Edition[]
}) {
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    if (!window.confirm('Excluir esta foto? A imagem é apagada do storage também.')) return
    const fd = new FormData()
    fd.append('id', String(photo.id))
    startTransition(async () => {
      await deletePhotoAction(fd)
    })
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden bg-white"
      style={{ border: '1px solid var(--line)' }}
    >
      {/* Imagem */}
      <div
        className="relative"
        style={{ aspectRatio: '4/3', background: 'var(--paper-2)' }}
      >
        <Image
          src={photo.url}
          alt={photo.alt ?? photo.caption ?? ''}
          fill
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="object-cover"
          unoptimized
        />
        {photo.featured && (
          <span
            className="absolute top-2 left-2 mono inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium"
            style={{ background: 'rgba(248,130,30,0.9)', color: 'white' }}
          >
            <Star size={10} /> DESTAQUE
          </span>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="rounded-md p-1.5"
            style={{
              background: 'rgba(255,255,255,0.95)',
              border: '1px solid var(--line)',
              color: 'var(--ink-50)',
            }}
            title="Editar"
          >
            {editing ? <X size={14} /> : <Pencil size={14} />}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="rounded-md p-1.5 disabled:opacity-50"
            style={{
              background: 'rgba(255,255,255,0.95)',
              border: '1px solid var(--line)',
              color: '#b91c1c',
            }}
            title="Excluir"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      </div>

      {/* Caption resumido */}
      {!editing && (
        <div className="p-3">
          <div
            className="text-xs font-medium truncate"
            style={{ color: 'var(--ink)' }}
            title={photo.caption ?? ''}
          >
            {photo.caption || '—'}
          </div>
          <div
            className="mono text-[10px] tracking-[0.06em] mt-1"
            style={{ color: 'var(--ink-50)' }}
          >
            {photo.edition_id
              ? editions.find((e) => e.id === photo.edition_id)?.year ?? `ED ${photo.edition_id}`
              : 'SEM EDIÇÃO'}
            {photo.size_hint ? ` · ${photo.size_hint}` : ''}
          </div>
        </div>
      )}

      {/* Form de edição */}
      {editing && (
        <form
          action={updatePhotoAction}
          onSubmit={() => setEditing(false)}
          className="p-3 space-y-3"
        >
          <input type="hidden" name="id" value={photo.id} />
          <div>
            <label
              className="mono block text-[9px] tracking-[0.1em] mb-1"
              style={{ color: 'var(--ink-50)' }}
            >
              LEGENDA
            </label>
            <input
              name="caption"
              defaultValue={photo.caption ?? ''}
              className="admin-input w-full px-2 py-1.5 rounded-md text-xs"
            />
          </div>
          <div>
            <label
              className="mono block text-[9px] tracking-[0.1em] mb-1"
              style={{ color: 'var(--ink-50)' }}
            >
              ALT (acessibilidade)
            </label>
            <input
              name="alt"
              defaultValue={photo.alt ?? ''}
              className="admin-input w-full px-2 py-1.5 rounded-md text-xs"
            />
          </div>
          <div>
            <label
              className="mono block text-[9px] tracking-[0.1em] mb-1"
              style={{ color: 'var(--ink-50)' }}
            >
              EDIÇÃO
            </label>
            <select
              name="edition_id"
              defaultValue={photo.edition_id ? String(photo.edition_id) : ''}
              className="admin-select w-full px-2 py-1.5 rounded-md text-xs"
            >
              <option value="">— sem edição —</option>
              {editions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.year} · {e.title}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                className="mono block text-[9px] tracking-[0.1em] mb-1"
                style={{ color: 'var(--ink-50)' }}
              >
                TAMANHO
              </label>
              <select
                name="size_hint"
                defaultValue={photo.size_hint ?? ''}
                className="admin-select w-full px-2 py-1.5 rounded-md text-xs"
              >
                <option value="">1×1 (padrão)</option>
                <option value="2x1">2×1</option>
                <option value="1x2">1×2</option>
                <option value="2x2">2×2</option>
              </select>
            </div>
            <div>
              <label
                className="mono block text-[9px] tracking-[0.1em] mb-1"
                style={{ color: 'var(--ink-50)' }}
              >
                ORDEM
              </label>
              <input
                name="order_index"
                type="number"
                defaultValue={String(photo.order_index ?? 0)}
                className="admin-input w-full px-2 py-1.5 rounded-md text-xs"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink-70)' }}>
            <input
              type="checkbox"
              name="featured"
              defaultChecked={photo.featured}
              className="cursor-pointer"
            />
            Marcar como destaque
          </label>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn btn-orange flex-1 justify-center">
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="btn btn-ghost"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
