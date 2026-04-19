'use client'

import { useEffect, useState, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { Plus, X, Upload, Loader2, AlertCircle, ImageIcon } from 'lucide-react'
import ModalPortal from '@/components/ui/ModalPortal'
import { uploadPhotosAction } from '@/app/admin/galeria/actions'

const MAX_FILES = 20
const MAX_BYTES = 10 * 1024 * 1024

type Edition = { id: number; year: number; title: string }

export default function PhotoUploadModal({
  editions,
  defaultEditionId,
}: {
  editions: Edition[]
  defaultEditionId?: number | null
}) {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function close() {
    setOpen(false)
    setTimeout(() => {
      setFiles([])
      setPreviews([])
      setError(null)
      if (inputRef.current) inputRef.current.value = ''
    }, 200)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? [])
    setError(null)
    if (list.length === 0) {
      setFiles([])
      setPreviews([])
      return
    }
    if (list.length > MAX_FILES) {
      setError(`Selecione no máximo ${MAX_FILES} arquivos por vez.`)
      return
    }
    const valid: File[] = []
    for (const f of list) {
      if (f.size > MAX_BYTES) {
        setError(`${f.name}: maior que 10MB`)
        return
      }
      if (!f.type.startsWith('image/')) {
        setError(`${f.name}: não é imagem`)
        return
      }
      valid.push(f)
    }
    setFiles(valid)
    Promise.all(
      valid.map(
        (f) =>
          new Promise<string>((resolve) => {
            const r = new FileReader()
            r.onload = (ev) => resolve(ev.target?.result as string)
            r.readAsDataURL(f)
          })
      )
    ).then(setPreviews)
  }

  function removeAt(i: number) {
    setFiles(files.filter((_, idx) => idx !== i))
    setPreviews(previews.filter((_, idx) => idx !== i))
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-orange btn-lg shrink-0"
      >
        <Plus size={16} /> Subir fotos
      </button>

      {open && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
            style={{ background: 'rgba(10,12,40,0.55)' }}
            onClick={close}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl rounded-[20px] bg-white my-4"
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
                    GALERIA · UPLOAD
                  </div>
                  <h2 className="display" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>
                    Subir fotos
                  </h2>
                  <p
                    className="text-sm mt-2"
                    style={{ color: 'var(--ink-70)', maxWidth: 460 }}
                  >
                    Selecione até {MAX_FILES} imagens por vez. Você pode editar
                    legenda, edição e destaque depois.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg p-2 transition-colors hover:bg-paper-2"
                  style={{ color: 'var(--ink-50)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form action={uploadPhotosAction} className="p-7 space-y-5">
                <label className="block">
                  <span
                    className="mono block text-[10px] tracking-[0.1em] mb-2"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    EDIÇÃO (OPCIONAL)
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

                <div>
                  <span
                    className="mono block text-[10px] tracking-[0.1em] mb-2"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    ARQUIVOS — {files.length} SELECIONADO(S)
                  </span>
                  <input
                    ref={inputRef}
                    type="file"
                    name="photos"
                    accept="image/png,image/jpeg,image/webp,image/avif"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="w-full rounded-xl py-8 grid place-items-center transition-colors hover:bg-paper-2"
                    style={{
                      border: '2px dashed var(--line)',
                      color: 'var(--ink-50)',
                    }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon size={28} />
                      <span className="mono text-[11px] tracking-[0.1em]">
                        CLIQUE PARA ESCOLHER OU ARRASTE
                      </span>
                      <span
                        className="text-[11px]"
                        style={{ color: 'var(--ink-50)' }}
                      >
                        PNG · JPG · WebP · AVIF · 10MB cada
                      </span>
                    </div>
                  </button>
                </div>

                {previews.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {previews.map((src, i) => (
                      <div
                        key={i}
                        className="relative rounded-lg overflow-hidden"
                        style={{
                          aspectRatio: '1/1',
                          border: '1px solid var(--line)',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="object-cover w-full h-full" />
                        <button
                          type="button"
                          onClick={() => removeAt(i)}
                          className="absolute top-1 right-1 rounded-full p-1 grid place-items-center"
                          style={{
                            background: 'rgba(0,0,0,0.6)',
                            color: 'white',
                          }}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {error && (
                  <div
                    className="rounded-lg px-3 py-2 text-xs flex items-start gap-2"
                    style={{
                      background: '#fff1f2',
                      color: '#b91c1c',
                      border: '1px solid #fecdd3',
                    }}
                  >
                    <AlertCircle size={12} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div
                  className="flex flex-wrap gap-3 pt-4"
                  style={{ borderTop: '1px solid var(--line)' }}
                >
                  <SubmitButton disabled={files.length === 0} count={files.length} />
                  <button type="button" onClick={close} className="btn btn-ghost btn-lg">
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

function SubmitButton({ disabled, count }: { disabled: boolean; count: number }) {
  const { pending } = useFormStatus()
  const isDisabled = disabled || pending
  return (
    <button
      type="submit"
      disabled={isDisabled}
      className="btn btn-orange btn-lg"
      style={isDisabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
    >
      {pending ? (
        <>
          <Loader2 size={14} className="animate-spin" /> Enviando...
        </>
      ) : (
        <>
          <Upload size={14} /> Subir {count > 0 ? `${count} foto(s)` : ''}
        </>
      )}
    </button>
  )
}
