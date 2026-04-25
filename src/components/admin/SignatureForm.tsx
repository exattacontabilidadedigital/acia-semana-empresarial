'use client'

import { useRef, useState, useTransition, type FormEvent } from 'react'
import { Loader2, Upload, Save } from 'lucide-react'
import {
  saveSignatureAction,
  uploadSignatureAssetAction,
} from '@/app/admin/certificados/actions'

type SignatureSize = 'small' | 'medium' | 'large' | 'xlarge'

type Signature = {
  id?: number
  name?: string
  role?: string | null
  organization?: string | null
  signature_image_url?: string | null
  organization_logo_url?: string | null
  image_size?: SignatureSize | null
  display_order?: number | null
  active?: boolean
}

const SIZE_OPTIONS: { value: SignatureSize; label: string }[] = [
  { value: 'small', label: 'Pequena' },
  { value: 'medium', label: 'Média' },
  { value: 'large', label: 'Grande' },
  { value: 'xlarge', label: 'Extra grande' },
]

export default function SignatureForm({
  signature,
  onSaved,
}: {
  signature?: Signature
  onSaved?: () => void
}) {
  const [sigImg, setSigImg] = useState(signature?.signature_image_url ?? '')
  const [orgLogo, setOrgLogo] = useState(signature?.organization_logo_url ?? '')
  const [imageSize, setImageSize] = useState<SignatureSize>(
    (signature?.image_size as SignatureSize) ?? 'medium'
  )
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, startTransition] = useTransition()

  // Captura o submit manualmente: pega FormData do form e SOBRESCREVE as URLs
  // com os valores do state. Isso elimina race conditions com hidden inputs
  // controlados (que estavam fazendo a URL chegar vazia no banco).
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    fd.set('signature_image_url', sigImg ?? '')
    fd.set('organization_logo_url', orgLogo ?? '')
    fd.set('image_size', imageSize)
    startTransition(async () => {
      await saveSignatureAction(fd)
      onSaved?.()
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {signature?.id && <input type="hidden" name="id" value={signature.id} />}

      <Field label="NOME *" name="name" defaultValue={signature?.name ?? ''} required />
      <Field
        label="CARGO"
        name="role"
        defaultValue={signature?.role ?? ''}
        placeholder="Presidente, Diretor, etc."
      />
      <Field
        label="ORGANIZAÇÃO"
        name="organization"
        defaultValue={signature?.organization ?? ''}
        placeholder="ACIA, Sebrae, etc."
      />

      <ImageUploadField
        label="IMAGEM DA ASSINATURA"
        currentUrl={sigImg}
        onChange={setSigImg}
      />

      <div>
        <span
          className="mono block text-[10px] tracking-[0.1em] mb-2"
          style={{ color: 'var(--ink-50)' }}
        >
          TAMANHO DA ASSINATURA NO CERTIFICADO
        </span>
        <div className="grid grid-cols-4 gap-1">
          {SIZE_OPTIONS.map((opt) => {
            const active = imageSize === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setImageSize(opt.value)}
                className="text-center text-xs rounded-md py-2 px-2 transition-colors"
                style={{
                  border: active
                    ? '1px solid var(--azul)'
                    : '1px solid var(--line)',
                  background: active ? 'rgba(43,46,141,0.08)' : 'white',
                  color: active ? 'var(--ink)' : 'var(--ink-70)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <ImageUploadField
        label="LOGO DA ORGANIZAÇÃO"
        currentUrl={orgLogo}
        onChange={setOrgLogo}
      />

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="ORDEM"
          name="display_order"
          type="number"
          defaultValue={signature?.display_order != null ? String(signature.display_order) : '0'}
        />
        <label className="flex items-center gap-2 text-sm pt-6">
          <input
            type="checkbox"
            name="active"
            defaultChecked={signature?.active ?? true}
          />
          Ativa
        </label>
      </div>

      <SubmitBtn pending={pending} />
    </form>
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
        className="admin-input w-full px-3 py-2 rounded-lg text-sm"
      />
    </label>
  )
}

function ImageUploadField({
  label,
  currentUrl,
  onChange,
}: {
  label: string
  currentUrl: string
  onChange: (url: string) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const result = await uploadSignatureAssetAction(fd)
      if (result.url) onChange(result.url)
      else setError(result.error ?? 'Falha no upload')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <span
        className="mono block text-[10px] tracking-[0.1em] mb-2"
        style={{ color: 'var(--ink-50)' }}
      >
        {label}
      </span>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />
      <div className="flex items-center gap-3">
        {currentUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={currentUrl}
            alt=""
            className="rounded-md"
            style={{
              width: 60,
              height: 36,
              objectFit: 'contain',
              border: '1px solid var(--line)',
              background: '#f8f8f8',
            }}
          />
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn btn-ghost"
          style={{ padding: '6px 12px', fontSize: 11 }}
        >
          {uploading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Upload size={12} />
          )}
          {currentUrl ? 'Trocar' : 'Subir'}
        </button>
        {currentUrl && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs"
            style={{ color: '#b91c1c' }}
          >
            Remover
          </button>
        )}
      </div>
      {error && (
        <div className="mt-2 text-xs" style={{ color: '#b91c1c' }}>
          {error}
        </div>
      )}
    </div>
  )
}

function SubmitBtn({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-orange w-full justify-center"
      style={pending ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
    >
      {pending ? (
        <>
          <Loader2 size={13} className="animate-spin" /> Salvando...
        </>
      ) : (
        <>
          <Save size={13} /> Salvar
        </>
      )}
    </button>
  )
}
