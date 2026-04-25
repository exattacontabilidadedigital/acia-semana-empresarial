'use client'

import { useRef, useState, useTransition } from 'react'
import { Pencil, Trash2, X, Star, Loader2, Play, ExternalLink, Upload } from 'lucide-react'
import { updateVideoAction, deleteVideoAction } from '@/app/admin/videos/actions'
import { parseVideoUrl } from '@/lib/video-url'

const MAX_THUMB_BYTES = 5 * 1024 * 1024
const ACCEPTED_THUMB = ['image/png', 'image/jpeg', 'image/webp', 'image/avif']

type Edition = { id: number; year: number; title: string }
type Video = {
  id: number
  video_url: string
  caption: string | null
  duration: string | null
  color: string | null
  thumbnail_url: string | null
  edition_id: number | null
  featured: boolean
  order_index: number | null
}

export default function VideoEditCard({
  video,
  editions,
}: {
  video: Video
  editions: Edition[]
}) {
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()

  const parsed = parseVideoUrl(video.video_url)
  const thumb = video.thumbnail_url || parsed.thumbnailUrl
  const cardBg = video.color || 'var(--azul)'

  function handleDelete() {
    if (!window.confirm('Excluir este vídeo? Não há como desfazer.')) return
    const fd = new FormData()
    fd.append('id', String(video.id))
    startTransition(async () => {
      await deleteVideoAction(fd)
    })
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden bg-white"
      style={{ border: '1px solid var(--line)' }}
    >
      {/* Preview */}
      <div
        className="relative"
        style={{
          aspectRatio: '16/9',
          background: cardBg,
        }}
      >
        {thumb && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={thumb}
            alt={video.caption ?? 'Vídeo'}
            className="absolute inset-0 object-cover w-full h-full"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.5) 100%)',
          }}
        />
        <div className="absolute inset-0 grid place-items-center">
          <div
            className="rounded-full grid place-items-center"
            style={{
              width: 56,
              height: 56,
              background: 'rgba(255,255,255,0.95)',
              color: cardBg,
            }}
          >
            <Play size={22} fill="currentColor" stroke="none" />
          </div>
        </div>
        {video.featured && (
          <span
            className="absolute top-2 left-2 mono inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium"
            style={{ background: 'rgba(248,130,30,0.9)', color: 'white' }}
          >
            <Star size={10} /> DESTAQUE
          </span>
        )}
        {video.duration && (
          <span
            className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] mono text-white"
            style={{ background: 'rgba(0,0,0,0.55)' }}
          >
            {video.duration}
          </span>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          <a
            href={video.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md p-1.5"
            style={{
              background: 'rgba(255,255,255,0.95)',
              border: '1px solid var(--line)',
              color: 'var(--ink-50)',
            }}
            title="Abrir URL"
          >
            <ExternalLink size={14} />
          </a>
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

      {/* Resumo */}
      {!editing && (
        <div className="p-3">
          <div
            className="text-xs font-medium truncate"
            style={{ color: 'var(--ink)' }}
            title={video.caption ?? ''}
          >
            {video.caption || '—'}
          </div>
          <div
            className="mono text-[10px] tracking-[0.06em] mt-1"
            style={{ color: 'var(--ink-50)' }}
          >
            {video.edition_id
              ? editions.find((e) => e.id === video.edition_id)?.year ?? `ED ${video.edition_id}`
              : 'SEM EDIÇÃO'}
            {' · '}
            {parsed.platform === 'unknown' ? 'URL DIRETA' : parsed.platform.toUpperCase()}
          </div>
        </div>
      )}

      {/* Form de edição */}
      {editing && (
        <form
          action={updateVideoAction}
          onSubmit={() => setEditing(false)}
          className="p-3 space-y-3"
        >
          <input type="hidden" name="id" value={video.id} />
          <FieldSm label="URL DO VÍDEO" name="video_url" defaultValue={video.video_url} />
          <FieldSm label="LEGENDA" name="caption" defaultValue={video.caption ?? ''} />
          <div className="grid grid-cols-2 gap-2">
            <FieldSm label="DURAÇÃO" name="duration" defaultValue={video.duration ?? ''} />
            <FieldSm
              label="ORDEM"
              name="order_index"
              type="number"
              defaultValue={String(video.order_index ?? 0)}
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
              defaultValue={video.edition_id ? String(video.edition_id) : ''}
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
          <FieldSm
            label="COR DO CARD"
            name="color"
            defaultValue={video.color ?? ''}
            placeholder="var(--azul)"
          />
          <ThumbnailUploadInline currentUrl={video.thumbnail_url} />
          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink-70)' }}>
            <input
              type="checkbox"
              name="featured"
              defaultChecked={video.featured}
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

function FieldSm({
  label,
  name,
  defaultValue,
  placeholder,
  type = 'text',
}: {
  label: string
  name: string
  defaultValue?: string
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label
        className="mono block text-[9px] tracking-[0.1em] mb-1"
        style={{ color: 'var(--ink-50)' }}
      >
        {label}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="admin-input w-full px-2 py-1.5 rounded-md text-xs"
      />
    </div>
  )
}

function ThumbnailUploadInline({ currentUrl }: { currentUrl: string | null }) {
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
      setError('Use PNG, JPG, WebP ou AVIF.')
      e.target.value = ''
      return
    }
    if (file.size > MAX_THUMB_BYTES) {
      setError('Maior que 5MB.')
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

  const display = preview || currentUrl

  return (
    <div>
      <label
        className="mono block text-[9px] tracking-[0.1em] mb-1"
        style={{ color: 'var(--ink-50)' }}
      >
        CAPA DO VÍDEO
      </label>

      <input
        ref={inputRef}
        type="file"
        name="thumbnail_file"
        accept={ACCEPTED_THUMB.join(',')}
        onChange={handleChange}
        className="hidden"
      />

      {display ? (
        <div
          className="relative rounded-md overflow-hidden mb-2"
          style={{
            aspectRatio: '16/9',
            border: '1px solid var(--line)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={display}
            alt="Capa"
            className="absolute inset-0 object-cover w-full h-full"
          />
          <div className="absolute top-1 right-1 flex gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-md p-1 grid place-items-center"
              style={{
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid var(--line)',
                color: 'var(--ink-50)',
              }}
              title="Trocar imagem"
            >
              <Upload size={11} />
            </button>
            {preview && (
              <button
                type="button"
                onClick={clearFile}
                className="rounded-md p-1 grid place-items-center"
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid var(--line)',
                  color: '#b91c1c',
                }}
                title="Cancelar troca"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-md py-3 grid place-items-center mb-2 transition-colors hover:bg-paper-2"
          style={{
            border: '2px dashed var(--line)',
            color: 'var(--ink-50)',
          }}
        >
          <div className="flex flex-col items-center gap-1">
            <Upload size={14} />
            <span className="mono text-[9px] tracking-[0.1em]">SUBIR IMAGEM</span>
          </div>
        </button>
      )}

      {error && (
        <div
          className="rounded-md px-2 py-1 text-[10px] mb-2"
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
        defaultValue={currentUrl ?? ''}
        placeholder="ou URL: https://..."
        className="admin-input w-full px-2 py-1.5 rounded-md text-xs"
      />
    </div>
  )
}
