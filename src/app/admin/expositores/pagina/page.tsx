'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import ModalPortal from '@/components/ui/ModalPortal'
import {
  Building2, Eye, EyeOff, X, Loader2, Plus, Pencil, Trash2,
  ImageIcon, ArrowUp, ArrowDown,
} from 'lucide-react'

interface PastExhibitor {
  id: number
  name: string
  category: string | null
  logo_url: string | null
  storage_path: string | null
  color: string | null
  order_index: number
  active: boolean
  created_at: string
}

const CATEGORIES = [
  'Indústria', 'Financeiro', 'Institucional', 'Educação',
  'Automotivo', 'Tecnologia', 'Construção', 'Varejo',
  'Energia', 'Agronegócio', 'Saúde', 'Serviços', 'Outro',
]

const COLOR_OPTIONS = [
  { value: 'var(--laranja)', label: 'Laranja' },
  { value: 'var(--verde)', label: 'Verde' },
  { value: 'var(--ciano)', label: 'Ciano' },
  { value: 'var(--azul)', label: 'Azul' },
]

const inputStyle = { border: '1px solid var(--line)', color: 'var(--ink)' } as const
const inputClass =
  'admin-input w-full px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors'

type FormState = {
  name: string
  category: string
  color: string
  order_index: number
  active: boolean
  logo_url: string | null
  storage_path: string | null
}

const emptyForm: FormState = {
  name: '',
  category: '',
  color: 'var(--laranja)',
  order_index: 0,
  active: true,
  logo_url: null,
  storage_path: null,
}

export default function AdminExpositoresPaginaPage() {
  const [items, setItems] = useState<PastExhibitor[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<PastExhibitor | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
  const [warning, setWarning] = useState<string>('')

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch('/api/past-exhibitors?all=1')
      const data = await res.json()
      setItems(data.exhibitors ?? [])
      setWarning(data.warning ?? '')
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm, order_index: items.length })
    setLogoFile(null)
    setFeedback('')
    setModal('create')
  }

  function openEdit(it: PastExhibitor) {
    setEditing(it)
    setForm({
      name: it.name,
      category: it.category || '',
      color: it.color || 'var(--laranja)',
      order_index: it.order_index,
      active: it.active,
      logo_url: it.logo_url,
      storage_path: it.storage_path,
    })
    setLogoFile(null)
    setFeedback('')
    setModal('edit')
  }

  async function uploadLogo(): Promise<{ url: string; path: string } | null> {
    if (!logoFile) return null
    const formData = new FormData()
    formData.append('file', logoFile)
    formData.append('folder', 'past-exhibitors')
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
    const data = await res.json()
    if (!res.ok || !data.url) return null
    return { url: data.url, path: data.path }
  }

  async function handleSave() {
    setSaving(true)
    setFeedback('')
    try {
      const uploaded = await uploadLogo()

      const payload: Record<string, unknown> = {
        name: form.name,
        category: form.category || null,
        color: form.color || null,
        order_index: form.order_index,
        active: form.active,
      }
      if (uploaded) {
        payload.logo_url = uploaded.url
        payload.storage_path = uploaded.path
      }

      let res: Response
      if (editing) {
        res = await fetch('/api/past-exhibitors', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, ...payload }),
        })
      } else {
        res = await fetch('/api/past-exhibitors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      const data = await res.json()
      if (!res.ok) {
        setFeedback(data.error || 'Erro ao salvar')
        return
      }
      setFeedback(editing ? 'Marca atualizada' : 'Marca criada')
      fetchData()
      setTimeout(() => setModal(null), 1000)
    } catch {
      setFeedback('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(it: PastExhibitor) {
    await fetch('/api/past-exhibitors', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: it.id, active: !it.active }),
    })
    fetchData()
  }

  async function moveItem(it: PastExhibitor, dir: -1 | 1) {
    const sorted = [...items].sort((a, b) => a.order_index - b.order_index)
    const idx = sorted.findIndex((s) => s.id === it.id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const other = sorted[swapIdx]
    await Promise.all([
      fetch('/api/past-exhibitors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: it.id, order_index: other.order_index }),
      }),
      fetch('/api/past-exhibitors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: other.id, order_index: it.order_index }),
      }),
    ])
    fetchData()
  }

  async function handleDelete(it: PastExhibitor) {
    if (!confirm(`Remover "${it.name}" do carrossel?`)) return
    await fetch(`/api/past-exhibitors?id=${it.id}`, { method: 'DELETE' })
    fetchData()
  }

  const visible = items
    .filter((it) =>
      filterActive === 'all'
        ? true
        : filterActive === 'active'
          ? it.active
          : !it.active,
    )
    .sort((a, b) => a.order_index - b.order_index)

  const counts = {
    total: items.length,
    active: items.filter((i) => i.active).length,
    inactive: items.filter((i) => !i.active).length,
  }

  return (
    <div className="page-enter" style={{ color: 'var(--ink)' }}>
      <div className="mb-10">
        <div className="eyebrow mb-4">
          <span className="dot" />
          PAINEL ADMINISTRATIVO · PÁGINA DE EXPOSITORES
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
          Página de Expositores
        </h1>
        <p
          className="mt-3"
          style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 620 }}
        >
          Gerencie as marcas que aparecem no carrossel{' '}
          <strong>&ldquo;Quem já expôs&rdquo;</strong> da página pública{' '}
          <code>/expositores</code>. Faça upload das logos, organize a ordem e
          ative/desative.
        </p>
      </div>

      {warning && (
        <div
          className="mb-6 rounded-2xl p-4 text-sm"
          style={{
            background: 'rgba(248,130,30,0.10)',
            border: '1px solid rgba(248,130,30,0.4)',
            color: '#b85d00',
          }}
        >
          <strong>Configuração pendente:</strong> {warning}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {([
            { v: 'all' as const, label: `Todas (${counts.total})` },
            { v: 'active' as const, label: `Ativas (${counts.active})` },
            { v: 'inactive' as const, label: `Ocultas (${counts.inactive})` },
          ]).map((f) => {
            const active = filterActive === f.v
            return (
              <button
                key={f.v}
                onClick={() => setFilterActive(f.v)}
                className="rounded-full text-xs font-medium"
                style={{
                  padding: '8px 14px',
                  border: active ? '1px solid var(--ink)' : '1px solid var(--line)',
                  background: active ? 'var(--ink)' : 'white',
                  color: active ? 'white' : 'var(--ink-70)',
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        <button onClick={openCreate} className="btn btn-orange">
          <Plus size={18} />
          Nova Marca
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin" size={32} style={{ color: 'var(--azul)' }} />
        </div>
      ) : (
        <div
          className="rounded-[20px] bg-white p-7"
          style={{ border: '1px solid var(--line)' }}
        >
          {visible.length === 0 ? (
            <div className="text-center py-16" style={{ color: 'var(--ink-50)' }}>
              <ImageIcon size={28} className="mx-auto mb-3" />
              <div className="mono text-[11px] tracking-[0.14em]">
                NENHUMA MARCA CADASTRADA
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visible.map((it, idx) => (
                <div
                  key={it.id}
                  className="rounded-2xl p-4 flex flex-col gap-3"
                  style={{
                    border: '1px solid var(--line)',
                    background: it.active ? 'white' : 'var(--paper-2)',
                    opacity: it.active ? 1 : 0.65,
                  }}
                >
                  <div
                    className="rounded-xl flex items-center justify-center overflow-hidden"
                    style={{
                      height: 120,
                      background: 'var(--paper-2)',
                      border: '1px solid var(--line)',
                    }}
                  >
                    {it.logo_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={it.logo_url}
                        alt={it.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <Building2 size={32} style={{ color: 'var(--ink-50)' }} />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full block shrink-0"
                      style={{ background: it.color || 'var(--ink-50)' }}
                    />
                    <span
                      className="mono text-[10px] tracking-[0.1em] truncate"
                      style={{ color: 'var(--ink-50)' }}
                    >
                      {(it.category || 'SEM CATEGORIA').toUpperCase()}
                    </span>
                  </div>

                  <div
                    className="display truncate"
                    style={{ fontSize: 18, letterSpacing: '-.02em' }}
                    title={it.name}
                  >
                    {it.name}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-auto pt-3" style={{ borderTop: '1px solid var(--line)' }}>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveItem(it, -1)}
                        disabled={idx === 0}
                        className="rounded p-1.5 transition-colors hover:bg-[var(--paper-2)] disabled:opacity-30"
                        style={{ color: 'var(--ink-50)' }}
                        title="Subir"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => moveItem(it, 1)}
                        disabled={idx === visible.length - 1}
                        className="rounded p-1.5 transition-colors hover:bg-[var(--paper-2)] disabled:opacity-30"
                        style={{ color: 'var(--ink-50)' }}
                        title="Descer"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleActive(it)}
                        className="rounded p-1.5 transition-colors hover:bg-[var(--paper-2)]"
                        style={{ color: it.active ? '#3d5a0a' : 'var(--ink-50)' }}
                        title={it.active ? 'Ocultar' : 'Mostrar'}
                      >
                        {it.active ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button
                        onClick={() => openEdit(it)}
                        className="rounded p-1.5 transition-colors hover:bg-[var(--paper-2)]"
                        style={{ color: 'var(--ink-50)' }}
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(it)}
                        className="rounded p-1.5 transition-colors hover:bg-[var(--paper-2)]"
                        style={{ color: '#991b1b' }}
                        title="Remover"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modal && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setModal(null)}
          >
            <div
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[20px] bg-white p-7"
              style={{ border: '1px solid var(--line)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="min-w-0">
                  <div
                    className="mono text-[10px] tracking-[0.14em]"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    {editing ? 'EDITAR' : 'NOVA'}
                  </div>
                  <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
                    {editing ? 'Editar marca' : 'Nova marca'}
                  </h2>
                </div>
                <button
                  onClick={() => setModal(null)}
                  className="rounded p-1.5 transition-colors hover:bg-[var(--paper-2)] shrink-0"
                  style={{ color: 'var(--ink-50)' }}
                >
                  <X size={20} />
                </button>
              </div>

              {feedback && (
                <div
                  className="mb-4 rounded-xl p-3 text-sm"
                  style={
                    feedback.toLowerCase().includes('erro')
                      ? { background: '#fee2e2', color: '#991b1b' }
                      : { background: 'rgba(166,206,58,0.18)', color: '#3d5a0a' }
                  }
                >
                  {feedback}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="col-span-2">
                  <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>
                    NOME DA MARCA *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Ex: Vale, Sebrae, Sicoob..."
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>
                    CATEGORIA
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className={inputClass}
                    style={inputStyle}
                  >
                    <option value="">— Sem categoria —</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>
                    COR DO INDICADOR
                  </label>
                  <select
                    value={form.color}
                    onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                    className={inputClass}
                    style={inputStyle}
                  >
                    {COLOR_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>
                    ORDEM
                  </label>
                  <input
                    type="number"
                    value={form.order_index}
                    onChange={(e) => setForm((p) => ({ ...p, order_index: Number(e.target.value) || 0 }))}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                    />
                    <span style={{ color: 'var(--ink-70)' }}>Ativo (mostrar no site)</span>
                  </label>
                </div>

                <div className="col-span-2">
                  <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>
                    LOGO DA MARCA
                  </label>
                  {form.logo_url && !logoFile && (
                    <div className="mb-2 flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.logo_url}
                        alt="Logo atual"
                        className="w-16 h-16 rounded-lg object-contain bg-[var(--paper-2)]"
                        style={{ border: '1px solid var(--line)' }}
                      />
                      <span
                        className="mono text-[10px] tracking-[0.06em]"
                        style={{ color: 'var(--ink-50)' }}
                      >
                        LOGO ATUAL
                      </span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                    className="admin-input w-full px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors file:mr-3 file:rounded-full file:border-0 file:bg-[var(--azul-50)] file:px-3 file:py-1 file:text-xs file:text-[var(--azul)]"
                    style={inputStyle}
                  />
                  <p className="mono text-[10px] mt-2" style={{ color: 'var(--ink-50)' }}>
                    PNG/JPG/SVG · Recomendado fundo transparente, máx. 1MB
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setModal(null)} className="btn btn-ghost">
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name}
                  className="btn btn-orange disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
