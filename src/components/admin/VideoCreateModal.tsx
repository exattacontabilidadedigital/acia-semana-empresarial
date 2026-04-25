'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Plus, X, Loader2, Save, ImageIcon, Trash2 } from 'lucide-react'
import ModalPortal from '@/components/ui/ModalPortal'
import { createVideoAction } from '@/app/admin/videos/actions'

type Edition = { id: number; year: number; title: string }

const MAX_THUMB_BYTES = 5 * 1024 * 1024
const ACCEPTED_THUMB = ['image/png', 'image/jpeg', 'image/webp', 'image/avif']

export default function VideoCreateModal({
  editions,
  defaultEditionId,
}: {
  editions: Edition[]
  defaultEditionId?: number | null
}) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) setOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, submitting])

  // Envia ao server action e fecha o modal logo após o início do submit pra
  // evitar cliques duplicados que criariam vídeos repetidos.
  async function handleSubmit(formData: FormData) {
    if (submitting) return
    setSubmitting(true)
    try {
      await createVideoAction(formData)
    } finally {
      setSubmitting(false)
      setOpen(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-orange btn-lg shrink-0"
      >
        <Plus size={16} /> Novo vídeo
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
                    GALERIA · NOVO VÍDEO
                  </div>
                  <h2 className="display" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>
                    Cadastrar vídeo
                  </h2>
                  <p
                    className="text-sm mt-2"
                    style={{ color: 'var(--ink-70)', maxWidth: 460 }}
                  >
                    Cole a URL do YouTube, Vimeo ou Instagram (post, reel ou
                    IGTV). O player aparece embutido no site quando o usuário
                    clica para reproduzir.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 transition-colors hover:bg-paper-2"
                  style={{ color: 'var(--ink-50)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form action={handleSubmit} className="p-7 space-y-5">
                <Field
                  label="URL DO VÍDEO *"
                  name="video_url"
                  required
                  placeholder="https://www.youtube.com/watch?v=... ou https://www.instagram.com/reel/..."
                />
                <Field
                  label="LEGENDA / TÍTULO"
                  name="caption"
                  placeholder="Aftermovie · 5ª Edição"
                />

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span
                      className="mono block text-[10px] tracking-[0.1em] mb-2"
                      style={{ color: 'var(--ink-50)' }}
                    >
                      EDIÇÃO
                    </span>
                    <select
                      name="edition_id"
                      defaultValue={defaultEditionId ? String(defaultEditionId) : ''}
                      className="admin-select w-full px-4 py-3 rounded-xl text-sm"
                    >
                      <option value="">— sem edição —</option>
                      {editions.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.year} · {e.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field
                    label="DURAÇÃO"
                    name="duration"
                    placeholder="2:14"
                  />
                </div>

                <ThumbnailField />

                <Field
                  label="COR DE FUNDO DO CARD"
                  name="color"
                  placeholder="var(--azul) ou #2b2e8d"
                />

                <div className="grid sm:grid-cols-2 gap-4 items-end">
                  <Field
                    label="ORDEM (menor = primeiro)"
                    name="order_index"
                    type="number"
                    defaultValue="0"
                  />
                  <label
                    className="flex items-center gap-2 text-sm pb-3"
                    style={{ color: 'var(--ink-70)' }}
                  >
                    <input
                      type="checkbox"
                      name="featured"
                      className="cursor-pointer"
                    />
                    Marcar como destaque (card grande)
                  </label>
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

function ThumbnailField() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setError(null)
    if (!file) {
      setPreview(null)
      return
    }
    if (!ACCEPTED_THUMB.includes(file.type)) {
      setError('Formato não suportado (use PNG, JPG, WebP ou AVIF).')
      e.target.value = ''
      return
    }
    if (file.size > MAX_THUMB_BYTES) {
      setError('Arquivo maior que 5MB.')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function clearFile() {
    if (inputRef.current) inputRef.current.value = ''
    setPreview(null)
    setError(null)
  }

  return (
    <div>
      <span
        className="mono block text-[10px] tracking-[0.1em] mb-2"
        style={{ color: 'var(--ink-50)' }}
      >
        CAPA DO VÍDEO (OPCIONAL)
      </span>
      <p
        className="text-xs mb-3"
        style={{ color: 'var(--ink-70)' }}
      >
        YouTube e Vimeo geram capa automaticamente. Pra Instagram, ou pra usar
        uma capa diferente, faça upload de uma imagem ou cole a URL abaixo.
      </p>

      <input
        ref={inputRef}
        type="file"
        name="thumbnail_file"
        accept={ACCEPTED_THUMB.join(',')}
        onChange={handleChange}
        className="hidden"
      />

      {preview ? (
        <div
          className="relative rounded-xl overflow-hidden mb-3"
          style={{
            aspectRatio: '16/9',
            border: '1px solid var(--line)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Pré-visualização da capa"
            className="absolute inset-0 object-cover w-full h-full"
          />
          <button
            type="button"
            onClick={clearFile}
            className="absolute top-2 right-2 rounded-md p-1.5 grid place-items-center"
            style={{
              background: 'rgba(255,255,255,0.95)',
              border: '1px solid var(--line)',
              color: '#b91c1c',
            }}
            title="Remover capa"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl py-6 grid place-items-center transition-colors hover:bg-paper-2 mb-3"
          style={{
            border: '2px dashed var(--line)',
            color: 'var(--ink-50)',
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <ImageIcon size={22} />
            <span className="mono text-[11px] tracking-[0.1em]">
              CLIQUE PARA ESCOLHER IMAGEM
            </span>
            <span className="text-[11px]" style={{ color: 'var(--ink-50)' }}>
              PNG · JPG · WebP · AVIF · 5MB
            </span>
          </div>
        </button>
      )}

      {error && (
        <div
          className="rounded-lg px-3 py-2 text-xs mb-3"
          style={{
            background: '#fff1f2',
            color: '#b91c1c',
            border: '1px solid #fecdd3',
          }}
        >
          {error}
        </div>
      )}

      <input
        name="thumbnail_url"
        type="text"
        placeholder="ou cole uma URL: https://..."
        className="admin-input w-full px-4 py-3 rounded-xl text-sm"
      />
    </div>
  )
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = 'text',
  required,
}: {
  label: string
  name: string
  defaultValue?: string
  placeholder?: string
  type?: string
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
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="admin-input w-full px-4 py-3 rounded-xl text-sm"
      />
    </label>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-orange btn-lg"
      style={pending ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
    >
      {pending ? (
        <>
          <Loader2 size={14} className="animate-spin" /> Salvando...
        </>
      ) : (
        <>
          <Save size={14} /> Cadastrar vídeo
        </>
      )}
    </button>
  )
}
