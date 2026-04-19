'use client'

import { useState, useRef, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import Image from 'next/image'
import { Upload, ImageOff, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import {
  uploadAssociateLogoAction,
  removeAssociateLogoAction,
} from '@/app/admin/associados/actions'

const MAX_BYTES = 2 * 1024 * 1024
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

export default function AssociateLogoUpload({
  id,
  currentUrl,
  alt,
}: {
  id: string
  currentUrl: string | null
  alt: string
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Limpa preview ao trocar a URL atual (após upload bem-sucedido o redirect refresca)
  useEffect(() => {
    setPreview(null)
    setFileName(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [currentUrl])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setError(null)
    if (!file) {
      setPreview(null)
      setFileName(null)
      return
    }
    if (!ACCEPTED.includes(file.type)) {
      setError('Formato inválido. Use PNG, JPG, WebP ou SVG.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máx 2MB.`)
      return
    }
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function clearSelection() {
    setPreview(null)
    setFileName(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function triggerPicker() {
    inputRef.current?.click()
  }

  return (
    <div>
      {/* Preview / atual / vazio */}
      <div
        className="rounded-xl overflow-hidden mb-3 grid place-items-center relative transition-all"
        style={{
          height: 140,
          background: preview ? 'var(--paper)' : 'var(--paper-2)',
          border: preview
            ? '2px solid var(--azul)'
            : currentUrl
              ? '1px solid var(--line)'
              : '1px dashed var(--line)',
        }}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Pré-visualização"
              className="object-contain w-full h-full"
            />
            <button
              type="button"
              onClick={clearSelection}
              aria-label="Remover seleção"
              className="absolute top-2 right-2 rounded-full p-1.5 grid place-items-center transition-colors"
              style={{
                background: 'white',
                border: '1px solid var(--line)',
                color: 'var(--ink-50)',
              }}
            >
              <X size={14} />
            </button>
            <span
              className="absolute bottom-2 left-2 mono text-[10px] tracking-[0.06em] px-2 py-1 rounded-md"
              style={{
                background: 'rgba(43,46,141,0.9)',
                color: 'white',
              }}
            >
              PRÉVIA · NÃO SALVO
            </span>
          </>
        ) : currentUrl ? (
          <Image
            src={currentUrl}
            alt={alt}
            width={240}
            height={140}
            className="object-contain w-full h-full"
            unoptimized
          />
        ) : (
          <div
            className="flex flex-col items-center gap-1"
            style={{ color: 'var(--ink-50)' }}
          >
            <ImageOff size={20} />
            <span className="mono text-[10px] tracking-[0.1em]">SEM LOGO</span>
          </div>
        )}
      </div>

      {fileName && !error && (
        <p
          className="mono text-[10px] tracking-[0.06em] mb-2 truncate"
          style={{ color: 'var(--ink-50)' }}
          title={fileName}
        >
          {fileName}
        </p>
      )}

      {error && (
        <div
          className="mb-3 rounded-lg px-3 py-2 text-xs flex items-start gap-2"
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

      {/* Formulário (file input escondido + botões) */}
      <form ref={formRef} action={uploadAssociateLogoAction}>
        <input type="hidden" name="id" value={id} />
        <input
          ref={inputRef}
          type="file"
          name="logo"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={handleFileChange}
          className="hidden"
        />

        {!preview ? (
          <button
            type="button"
            onClick={triggerPicker}
            className="btn btn-orange w-full justify-center"
          >
            <Upload size={14} />
            {currentUrl ? 'Trocar logo' : 'Escolher imagem'}
          </button>
        ) : (
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <button
              type="button"
              onClick={clearSelection}
              className="btn btn-ghost"
            >
              Cancelar
            </button>
            <SubmitButton />
          </div>
        )}
      </form>

      {currentUrl && !preview && (
        <form action={removeAssociateLogoAction} className="mt-2">
          <input type="hidden" name="id" value={id} />
          <RemoveButton />
        </form>
      )}

      <p className="mt-3 text-[11px]" style={{ color: 'var(--ink-50)' }}>
        PNG · JPG · WebP · SVG · máx 2MB
      </p>
    </div>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-orange w-full justify-center"
      style={pending ? { opacity: 0.85, pointerEvents: 'none' } : undefined}
    >
      {pending ? (
        <>
          <Loader2 size={14} className="animate-spin" /> Enviando...
        </>
      ) : (
        <>
          <CheckCircle2 size={14} /> Confirmar upload
        </>
      )}
    </button>
  )
}

function RemoveButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mono text-[10px] tracking-[0.1em] w-full text-center hover:opacity-70 transition-opacity py-2 disabled:opacity-50"
      style={{ color: '#b91c1c' }}
    >
      {pending ? 'REMOVENDO...' : 'REMOVER LOGO'}
    </button>
  )
}
