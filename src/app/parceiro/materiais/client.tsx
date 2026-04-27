'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Trash2, ExternalLink, FileText } from 'lucide-react'

export type MaterialFile = {
  name: string
  path: string
  url: string
  size: number
  contentType: string
  createdAt: string | null
}

function isImage(file: MaterialFile): boolean {
  return (
    file.contentType.startsWith('image/') ||
    /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name)
  )
}

function formatBytes(n: number): string {
  if (!n) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export default function MateriaisClient({
  orgName,
  files,
}: {
  orgName: string
  files: MaterialFile[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/parceiro/materiais', {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Falha no upload (${res.status})`)
      }
      e.target.value = ''
      startTransition(() => router.refresh())
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao enviar arquivo')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(path: string) {
    if (!confirm('Remover este arquivo? A ação não pode ser desfeita.')) return
    setError(null)
    try {
      const res = await fetch('/api/parceiro/materiais', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Falha ao remover (${res.status})`)
      }
      startTransition(() => router.refresh())
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao remover arquivo')
    }
  }

  return (
    <div className="page-enter">
      <div className="mb-10">
        <div className="eyebrow mb-4">
          <span className="dot" />
          PORTAL · MATERIAIS
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
          Materiais da organização
        </h1>
        <p
          className="mt-3"
          style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
        >
          Logos, banners e arquivos institucionais de{' '}
          <strong style={{ color: 'var(--ink)' }}>{orgName}</strong>. Os
          arquivos ficam isolados por organização e podem ser usados nos
          eventos.
        </p>
      </div>

      {error && (
        <div
          className="mb-6 p-3 rounded-xl text-sm"
          style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#b91c1c',
          }}
        >
          {error}
        </div>
      )}

      {/* Upload */}
      <div
        className="rounded-[20px] bg-white p-7 mb-5"
        style={{ border: '1px solid var(--line)' }}
      >
        <div
          className="mono text-[10px] tracking-[0.14em] mb-2"
          style={{ color: 'var(--ink-50)' }}
        >
          NOVO ARQUIVO
        </div>
        <h2 className="display mb-4" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
          Enviar material
        </h2>
        <label
          className="flex flex-col items-center justify-center gap-3 px-6 py-10 rounded-2xl cursor-pointer transition-colors"
          style={{
            border: '2px dashed var(--line)',
            background: uploading ? 'var(--paper)' : 'transparent',
            color: 'var(--ink-70)',
          }}
        >
          <Upload size={28} style={{ color: 'var(--laranja)' }} />
          <div className="text-sm">
            {uploading ? (
              <span className="mono tracking-[0.1em]">ENVIANDO…</span>
            ) : (
              <>
                <strong style={{ color: 'var(--ink)' }}>Clique para escolher</strong>{' '}
                ou arraste um arquivo
              </>
            )}
          </div>
          <div className="mono text-[11px]" style={{ color: 'var(--ink-50)' }}>
            IMAGENS, PDFS, ATÉ 10MB
          </div>
          <input
            type="file"
            className="hidden"
            disabled={uploading}
            onChange={handleUpload}
            accept="image/*,application/pdf"
          />
        </label>
      </div>

      {/* Galeria */}
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
              {files.length} ARQUIVOS
            </div>
            <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
              Biblioteca
            </h2>
          </div>
          {isPending && (
            <span className="mono text-[10px] tracking-[0.1em]" style={{ color: 'var(--ink-50)' }}>
              ATUALIZANDO…
            </span>
          )}
        </div>

        {files.length === 0 ? (
          <div
            className="text-center py-16 mono text-[11px] tracking-[0.14em]"
            style={{ color: 'var(--ink-50)' }}
          >
            NENHUM MATERIAL AINDA
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((f) => (
              <FileCard key={f.path} file={f} onDelete={() => handleDelete(f.path)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FileCard({
  file,
  onDelete,
}: {
  file: MaterialFile
  onDelete: () => void
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ border: '1px solid var(--line)', background: 'white' }}
    >
      <div
        className="aspect-square w-full grid place-items-center"
        style={{ background: 'var(--paper)' }}
      >
        {isImage(file) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.url}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileText size={36} style={{ color: 'var(--ink-50)' }} />
        )}
      </div>
      <div className="p-3 flex flex-col gap-2">
        <div
          className="text-[12px] truncate"
          style={{ color: 'var(--ink)' }}
          title={file.name}
        >
          {file.name}
        </div>
        <div
          className="mono text-[10px] tracking-[0.06em] flex items-center justify-between"
          style={{ color: 'var(--ink-50)' }}
        >
          <span>{formatBytes(file.size)}</span>
          <div className="flex items-center gap-2">
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir"
              className="hover:opacity-70 transition-opacity"
              style={{ color: 'var(--azul)' }}
            >
              <ExternalLink size={12} />
            </a>
            <button
              type="button"
              onClick={onDelete}
              title="Remover"
              className="hover:opacity-70 transition-opacity"
              style={{ color: '#b91c1c' }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
