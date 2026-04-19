import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle, FileText, Archive, ArrowUpRight } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  updateEditionAction,
  setEditionStatusAction,
} from '@/app/admin/edicoes/actions'
import EdicaoCoverUpload from '@/components/admin/EdicaoCoverUpload'
import ConfirmDeleteEdicaoButton from '@/components/admin/ConfirmDeleteEdicaoButton'

export const dynamic = 'force-dynamic'

const STATUS_PILL: Record<string, { bg: string; color: string; label: string }> = {
  published: { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a', label: 'PUBLICADA' },
  draft: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'RASCUNHO' },
  archived: { bg: '#fee2e2', color: '#991b1b', label: 'ARQUIVADA' },
}

function statsToText(stats: any): string {
  if (!Array.isArray(stats)) return ''
  return stats
    .map((s) => {
      if (Array.isArray(s)) return `${s[0] ?? ''}|${s[1] ?? ''}`
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

export default async function EdicaoDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { saved?: string; created?: string; cover_saved?: string; error?: string }
}) {
  const admin = createAdminClient()

  const { data: ed } = await admin
    .from('editions')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (!ed) notFound()

  const { count: photoCount } = await admin
    .from('gallery_photos')
    .select('id', { count: 'exact', head: true })
    .eq('edition_id', params.id)

  const status = STATUS_PILL[ed.status] ?? STATUS_PILL.draft

  return (
    <div className="page-enter">
      <Link
        href="/admin/edicoes"
        className="mono text-[11px] tracking-[0.14em] inline-flex items-center gap-1 mb-6 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--ink-50)' }}
      >
        <ArrowLeft size={12} /> VOLTAR
      </Link>

      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="eyebrow mb-3">
            <span className="dot" />
            EDIÇÃO {ed.year}
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(32px, 4vw, 44px)' }}>
            {ed.ordinal ? `${ed.ordinal} — ` : ''}
            {ed.title}
          </h1>
        </div>
        <span
          className="mono inline-flex items-center px-3 py-1.5 rounded-full text-[11px] tracking-[0.1em] font-medium whitespace-nowrap"
          style={{ background: status.bg, color: status.color }}
        >
          {status.label}
        </span>
      </div>

      {searchParams.created && <Banner color="success">Edição cadastrada.</Banner>}
      {searchParams.saved && <Banner color="success">Alterações salvas.</Banner>}
      {searchParams.cover_saved && <Banner color="success">Capa atualizada.</Banner>}
      {searchParams.error && <Banner color="error">{searchParams.error}</Banner>}

      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <form
          action={updateEditionAction}
          className="lg:col-span-2 rounded-[20px] bg-white p-7 space-y-6"
          style={{ border: '1px solid var(--line)' }}
        >
          <input type="hidden" name="id" value={ed.id} />
          <SectionTitle eyebrow="DADOS" title="Editar edição" />

          <Section title="IDENTIFICAÇÃO">
            <div className="grid sm:grid-cols-[120px_120px_1fr] gap-4">
              <Field label="ANO *" name="year" type="number" required defaultValue={String(ed.year)} />
              <Field label="ORDINAL" name="ordinal" defaultValue={ed.ordinal ?? ''} />
              <Field label="TÍTULO *" name="title" required defaultValue={ed.title} />
            </div>
            <Field
              label="DESCRIÇÃO"
              name="description"
              textarea
              defaultValue={ed.description ?? ''}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="COR DE DESTAQUE"
                name="color"
                defaultValue={ed.color ?? ''}
                placeholder="var(--azul) ou #2b2e8d"
              />
              <Field
                label="ORDEM (menor = primeiro)"
                name="order_index"
                type="number"
                defaultValue={String(ed.order_index ?? 0)}
              />
            </div>
          </Section>

          <Section title="NÚMEROS DA EDIÇÃO">
            <p
              className="text-xs -mt-3 mb-2"
              style={{ color: 'var(--ink-70)' }}
            >
              Um por linha, formato <code>VALOR|RÓTULO</code>. Ex:{' '}
              <code>1.200|participantes</code>
            </p>
            <Field
              label="STATS"
              name="stats_text"
              textarea
              defaultValue={statsToText(ed.stats)}
              placeholder="1.200|participantes&#10;38|palestrantes&#10;12|edições"
            />
          </Section>

          <Section title="LINKS EXTERNOS">
            <Field
              label="MATERIAL DE IMPRENSA (URL)"
              name="press_kit_url"
              defaultValue={ed.press_kit_url ?? ''}
              placeholder="https://..."
            />
            <Field
              label="CAPA (URL — preencha aqui ou use upload ao lado)"
              name="cover_url"
              defaultValue={ed.cover_url ?? ''}
              placeholder="https://..."
            />
          </Section>

          <div
            className="flex flex-wrap gap-3 pt-4"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <button type="submit" className="btn btn-orange btn-lg">
              Salvar alterações
            </button>
            <Link
              href={`/admin/galeria?edicao=${ed.id}`}
              className="btn btn-ghost btn-lg"
            >
              Gerenciar galeria <ArrowUpRight size={14} />
            </Link>
          </div>
        </form>

        <div className="space-y-5">
          <div
            className="rounded-[20px] bg-white p-7"
            style={{ border: '1px solid var(--line)' }}
          >
            <SectionTitle eyebrow="AÇÕES" title="Status" />
            <div className="mt-5 space-y-2">
              <form action={setEditionStatusAction}>
                <input type="hidden" name="id" value={ed.id} />
                <input type="hidden" name="status" value="published" />
                <button
                  type="submit"
                  disabled={ed.status === 'published'}
                  className="btn btn-ghost w-full justify-center"
                  style={
                    ed.status === 'published'
                      ? { opacity: 0.5, pointerEvents: 'none' }
                      : undefined
                  }
                >
                  <CheckCircle size={14} /> Publicar
                </button>
              </form>
              <form action={setEditionStatusAction}>
                <input type="hidden" name="id" value={ed.id} />
                <input type="hidden" name="status" value="draft" />
                <button
                  type="submit"
                  disabled={ed.status === 'draft'}
                  className="btn btn-ghost w-full justify-center"
                  style={
                    ed.status === 'draft'
                      ? { opacity: 0.5, pointerEvents: 'none' }
                      : undefined
                  }
                >
                  <FileText size={14} /> Rascunho
                </button>
              </form>
              <form action={setEditionStatusAction}>
                <input type="hidden" name="id" value={ed.id} />
                <input type="hidden" name="status" value="archived" />
                <button
                  type="submit"
                  disabled={ed.status === 'archived'}
                  className="btn btn-ghost w-full justify-center"
                  style={
                    ed.status === 'archived'
                      ? { opacity: 0.5, pointerEvents: 'none' }
                      : undefined
                  }
                >
                  <Archive size={14} /> Arquivar
                </button>
              </form>
              <ConfirmDeleteEdicaoButton id={String(ed.id)} />
            </div>

            <div className="mt-7 pt-6" style={{ borderTop: '1px solid var(--line)' }}>
              <SectionTitle eyebrow="CAPA" title="Imagem de destaque" />
              <div className="mt-5">
                <EdicaoCoverUpload
                  id={String(ed.id)}
                  currentUrl={ed.cover_url}
                  alt={ed.title}
                />
              </div>
            </div>

            <div
              className="mt-7 pt-6"
              style={{ borderTop: '1px solid var(--line)' }}
            >
              <div
                className="mono text-[10px] tracking-[0.14em]"
                style={{ color: 'var(--ink-50)' }}
              >
                FOTOS NA GALERIA
              </div>
              <div
                className="display mt-1"
                style={{ fontSize: 32, color: 'var(--ink)', letterSpacing: '-0.02em' }}
              >
                {photoCount ?? 0}
              </div>
              <Link
                href={`/admin/galeria?edicao=${ed.id}`}
                className="mono text-[11px] tracking-[0.1em] inline-flex items-center gap-1 mt-2 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--azul)' }}
              >
                ABRIR GALERIA <ArrowUpRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="mono text-[10px] tracking-[0.14em] mb-4"
        style={{ color: 'var(--ink-50)' }}
      >
        {title}
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  )
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div
        className="mono text-[10px] tracking-[0.14em]"
        style={{ color: 'var(--ink-50)' }}
      >
        {eyebrow}
      </div>
      <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
        {title}
      </h2>
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
  textarea,
}: {
  label: string
  name: string
  defaultValue?: string
  placeholder?: string
  type?: string
  required?: boolean
  textarea?: boolean
}) {
  return (
    <label className="block">
      <span
        className="mono block text-[10px] tracking-[0.1em] mb-2"
        style={{ color: 'var(--ink-50)' }}
      >
        {label}
      </span>
      {textarea ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          rows={4}
          className="admin-textarea w-full px-4 py-3 rounded-xl text-sm"
        />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          className="admin-input w-full px-4 py-3 rounded-xl text-sm"
        />
      )}
    </label>
  )
}

function Banner({
  color,
  children,
}: {
  color: 'success' | 'error'
  children: React.ReactNode
}) {
  const styles =
    color === 'success'
      ? { bg: 'rgba(166,206,58,0.10)', border: '1px solid rgba(166,206,58,0.4)', color: '#3d5a0a' }
      : { bg: '#fff1f2', border: '1px solid #fecdd3', color: '#b91c1c' }
  return (
    <div
      className="mb-6 p-3 rounded-xl text-sm"
      style={{ background: styles.bg, border: styles.border, color: styles.color }}
    >
      {children}
    </div>
  )
}
