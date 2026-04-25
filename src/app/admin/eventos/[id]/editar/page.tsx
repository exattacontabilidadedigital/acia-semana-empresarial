'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Save, Loader2 } from 'lucide-react'

const categories = [
  'palestra',
  'workshop',
  'painel',
  'networking',
  'abertura',
  'encerramento',
  'cultural',
  'outro',
]

export default function EditarEventoPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'palestra',
    event_date: '',
    start_time: '',
    end_time: '',
    location: '',
    capacity: 100,
    price: 0,
    half_price: 0,
    status: 'draft',
    image_url: '' as string | null,
  })

  const [imageFile, setImageFile] = useState<File | null>(null)

  useEffect(() => {
    async function fetchEvent() {
      const { data, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', Number(id))
        .single()

      if (fetchError || !data) {
        setError('Evento não encontrado')
        setLoading(false)
        return
      }

      setForm({
        title: data.title,
        description: data.description,
        category: data.category,
        event_date: data.event_date,
        start_time: data.start_time,
        end_time: data.end_time ?? '',
        location: data.location ?? '',
        capacity: data.capacity,
        price: data.price,
        half_price: data.half_price,
        status: data.status,
        image_url: data.image_url,
      })
      setLoading(false)
    }
    fetchEvent()
  }, [id, supabase])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: ['capacity', 'price', 'half_price'].includes(name) ? Number(value) : value,
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      let image_url = form.image_url

      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('events')
          .upload(path, imageFile)
        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from('events').getPublicUrl(path)
        image_url = urlData.publicUrl
      }

      const { error: updateError } = await supabase
        .from('events')
        .update({
          title: form.title,
          description: form.description,
          category: form.category,
          event_date: form.event_date,
          start_time: form.start_time,
          end_time: form.end_time || null,
          location: form.location || null,
          capacity: form.capacity,
          price: form.price,
          half_price: form.half_price,
          status: form.status,
          image_url,
        })
        .eq('id', Number(id))

      if (updateError) throw updateError

      router.push('/admin/eventos')
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar evento')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page-enter flex items-center justify-center py-20">
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--azul)' }} />
      </div>
    )
  }

  const inputClass =
    'admin-input w-full px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors'
  const selectClass =
    'admin-select w-full px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors'
  const textareaClass =
    'admin-textarea w-full px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors'
  const labelClass = 'mono block text-[10px] tracking-[0.1em] mb-2'
  const inputStyle = { border: '1px solid var(--line)', color: 'var(--ink)' } as const
  const labelStyle = { color: 'var(--ink-50)' } as const

  return (
    <div className="page-enter" style={{ color: 'var(--ink)' }}>
      {/* Header */}
      <div className="mb-10">
        <div className="eyebrow mb-4">
          <span className="dot" />
          EVENTOS · EDIÇÃO
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
          Editar Evento
        </h1>
        <p className="mt-3" style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}>
          Atualize os dados do evento. As alterações entram em vigor imediatamente após salvar.
        </p>
      </div>

      {error && (
        <div
          className="mb-6 rounded-2xl p-4 text-sm"
          style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-[20px] bg-white p-7"
        style={{ border: '1px solid var(--line)' }}
      >
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="min-w-0">
            <div
              className="mono text-[10px] tracking-[0.14em]"
              style={{ color: 'var(--ink-50)' }}
            >
              FORMULÁRIO
            </div>
            <h2
              className="display mt-1"
              style={{ fontSize: 22, letterSpacing: '-0.02em' }}
            >
              Dados do evento
            </h2>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelClass} style={labelStyle}>TÍTULO</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass} style={labelStyle}>DESCRIÇÃO</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              rows={4}
              className={textareaClass}
              style={inputStyle}
            />
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>CATEGORIA</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className={selectClass}
              style={inputStyle}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>STATUS</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className={selectClass}
              style={inputStyle}
            >
              <option value="draft">Rascunho</option>
              <option value="active">Ativo</option>
              <option value="sold_out">Esgotado</option>
              <option value="closed">Encerrado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>DATA</label>
            <input
              type="date"
              name="event_date"
              value={form.event_date}
              onChange={handleChange}
              required
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>HORÁRIO INÍCIO</label>
            <input
              type="time"
              name="start_time"
              value={form.start_time}
              onChange={handleChange}
              required
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>HORÁRIO FIM</label>
            <input
              type="time"
              name="end_time"
              value={form.end_time}
              onChange={handleChange}
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>LOCAL</label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>CAPACIDADE</label>
            <input
              type="number"
              name="capacity"
              value={form.capacity}
              onChange={handleChange}
              min={1}
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>PREÇO (R$)</label>
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              min={0}
              step={0.01}
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>VAGAS MEIA-ENTRADA</label>
            <input
              type="number"
              name="half_price"
              value={form.half_price}
              onChange={handleChange}
              min={0}
              step={1}
              className={inputClass}
              style={inputStyle}
            />
            <p
              className="mono text-[10px] tracking-[0.06em] mt-2"
              style={{ color: 'var(--ink-50)' }}
            >
              QUANTIDADE DE INSCRIÇÕES COM 50% DE DESCONTO DISPONÍVEIS
            </p>
          </div>

          <div className="md:col-span-2">
            <label className={labelClass} style={labelStyle}>IMAGEM</label>
            {form.image_url && (
              <p
                className="mono text-[10px] tracking-[0.06em] mb-2"
                style={{ color: 'var(--ink-50)' }}
              >
                IMAGEM ATUAL DEFINIDA · ENVIE UMA NOVA PARA SUBSTITUIR
              </p>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="admin-input w-full px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors file:mr-3 file:rounded-full file:border-0 file:px-3 file:py-1 file:text-xs file:font-medium file:cursor-pointer"
              style={{
                border: '1px solid var(--line)',
                color: 'var(--ink-70)',
              }}
            />
          </div>
        </div>

        <div
          className="mt-8 pt-6 flex justify-end gap-3"
          style={{ borderTop: '1px solid var(--line)' }}
        >
          <button
            type="button"
            onClick={() => router.push('/admin/eventos')}
            className="btn btn-ghost"
            disabled={saving}
          >
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn btn-orange">
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}
