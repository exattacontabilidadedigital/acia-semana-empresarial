import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { updateFaqAction } from '../actions'

export const dynamic = 'force-dynamic'

const CATEGORY_LABELS: Record<string, string> = {
  faq: 'FAQ Geral',
  venue: 'Local / Venue',
  policy: 'Políticas',
  how_it_works: 'Como Funciona',
  other: 'Outros',
}

export default async function EditFaqPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { saved?: string; error?: string }
}) {
  const id = Number(params.id)
  if (!Number.isFinite(id) || id <= 0) notFound()

  const supabase = createServerSupabaseClient()
  const { data: row } = await supabase
    .from('chat_knowledge')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!row) notFound()

  return (
    <div className="page-enter">
      <Link
        href="/admin/chat-conhecimento"
        className="mono text-[11px] tracking-[0.14em] inline-flex items-center gap-1 mb-6 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--ink-50)' }}
      >
        <ArrowLeft size={12} /> VOLTAR
      </Link>

      <div className="mb-8">
        <div className="eyebrow mb-4">
          <span className="dot" />
          CONHECIMENTO · #{row.id}
        </div>
        <h1
          className="display"
          style={{ fontSize: 'clamp(28px, 4vw, 40px)', letterSpacing: '-0.02em' }}
        >
          Editar conhecimento
        </h1>
      </div>

      {searchParams.saved && (
        <Banner color="success">Salvo com sucesso. A IA já consulta esta resposta.</Banner>
      )}
      {searchParams.error && <Banner color="error">{searchParams.error}</Banner>}

      <form
        action={updateFaqAction}
        className="rounded-2xl bg-white p-7 space-y-6"
        style={{ border: '1px solid var(--line)' }}
      >
        <input type="hidden" name="id" value={row.id} />

        <Field label="CATEGORIA *">
          <select
            name="category"
            defaultValue={row.category}
            required
            className="admin-select w-full px-4 py-3 rounded-xl text-sm"
          >
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>

        <Field label="PERGUNTA *">
          <input
            name="question"
            defaultValue={row.question}
            placeholder="Ex: Tem certificado de participação?"
            required
            className="admin-input w-full px-4 py-3 rounded-xl text-sm"
          />
        </Field>

        <Field label="RESPOSTA *">
          <textarea
            name="answer"
            defaultValue={row.answer}
            rows={8}
            required
            placeholder="Resposta clara e direta. Pode usar markdown simples (**negrito**, listas com -)."
            className="admin-textarea w-full px-4 py-3 rounded-xl text-sm"
          />
          <p className="text-[11px] mt-2" style={{ color: 'var(--ink-50)' }}>
            Markdown simples suportado. Mantenha entre 2-6 frases — a IA pode adaptar para
            caber na resposta do chat.
          </p>
        </Field>

        <Field label="PALAVRAS-CHAVE (separadas por vírgula)">
          <input
            name="keywords"
            defaultValue={(row.keywords ?? []).join(', ')}
            placeholder="certificado, participacao, diploma"
            className="admin-input w-full px-4 py-3 rounded-xl text-sm"
          />
          <p className="text-[11px] mt-2" style={{ color: 'var(--ink-50)' }}>
            Ajuda o buscador a encontrar a FAQ quando o usuário usa sinônimos.
          </p>
        </Field>

        <div className="grid grid-cols-2 gap-5">
          <Field label="ORDEM (menor = primeiro)">
            <input
              name="order_index"
              type="number"
              defaultValue={row.order_index ?? 0}
              className="admin-input w-full px-4 py-3 rounded-xl text-sm"
            />
          </Field>
          <Field label="STATUS">
            <label className="flex items-center gap-2 mt-3">
              <input
                type="checkbox"
                name="active"
                defaultChecked={row.active}
                className="w-4 h-4"
              />
              <span className="text-sm">Ativo (visível para a IA)</span>
            </label>
          </Field>
        </div>

        <div
          className="flex flex-wrap gap-3 pt-4"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <button type="submit" className="btn btn-orange btn-lg">
            Salvar alterações
          </button>
          <Link href="/admin/chat-conhecimento" className="btn btn-ghost btn-lg">
            Cancelar
          </Link>
        </div>
      </form>

      <p
        className="mt-6 text-[11px]"
        style={{ color: 'var(--ink-50)' }}
      >
        Para excluir esta FAQ, volte para a lista e use o botão ✕ ao lado da
        pergunta.
      </p>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span
        className="mono block text-[10px] tracking-[0.1em] mb-2"
        style={{ color: 'var(--ink-50)' }}
      >
        {label}
      </span>
      {children}
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
