'use client'

import { useRef, useState } from 'react'
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react'
import { uploadTemplateBackgroundAction } from '@/app/admin/certificados/actions'

// Campo de upload da imagem de fundo do template. Mostra preview grande
// (16/9) já que é arte completa do certificado, não logo pequeno.
export default function TemplateBackgroundField({
  defaultUrl,
}: {
  defaultUrl?: string | null
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string>(defaultUrl ?? '')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const result = await uploadTemplateBackgroundAction(fd)
      if (result.url) setUrl(result.url)
      else setError(result.error ?? 'Falha no upload.')
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
        IMAGEM DE FUNDO (OPCIONAL)
      </span>
      <p
        className="text-xs mb-3"
        style={{ color: 'var(--ink-70)' }}
      >
        Quando setada, a arte preenche o certificado inteiro e as bordas
        decorativas padrão somem. Use proporção <strong>A4 paisagem (297×210mm
        / 1754×1240px @150dpi)</strong> e deixe áreas claras onde o texto vai
        aparecer pra ficar legível.
      </p>

      {/* Hidden input pro server action */}
      <input type="hidden" name="background_url" value={url} />

      {/* File input invisível */}
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

      {url ? (
        <div className="flex items-center gap-4 flex-wrap">
          <div
            className="relative rounded-lg overflow-hidden flex-shrink-0"
            style={{
              width: 200,
              aspectRatio: '297/210',
              border: '1px solid var(--line)',
              background: '#f8f8f8',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Capa"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn btn-ghost"
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              {uploading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Upload size={12} />
              )}
              Trocar imagem
            </button>
            <button
              type="button"
              onClick={() => setUrl('')}
              className="btn btn-ghost"
              style={{ padding: '6px 12px', fontSize: 12, color: '#b91c1c' }}
            >
              Remover
            </button>
            <span
              className="text-[10px] mt-1"
              style={{ color: 'var(--ink-50)' }}
            >
              Remover volta às bordas decorativas
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-xl py-6 grid place-items-center transition-colors hover:bg-paper-2"
          style={{
            border: '2px dashed var(--line)',
            color: 'var(--ink-50)',
            width: 280,
            aspectRatio: '297/210',
          }}
        >
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <ImageIcon size={24} />
            )}
            <span className="mono text-[11px] tracking-[0.1em]">
              {uploading ? 'ENVIANDO...' : 'CLIQUE PARA SUBIR'}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--ink-50)' }}>
              PNG · JPG · WebP · até 8MB
            </span>
          </div>
        </button>
      )}

      {error && (
        <div
          className="mt-2 rounded-lg px-3 py-2 text-xs"
          style={{
            background: '#fff1f2',
            color: '#b91c1c',
            border: '1px solid #fecdd3',
          }}
        >
          {error}
        </div>
      )}
    </div>
  )
}
