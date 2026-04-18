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
  const { id } = useParams<{ id: string }>()
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-purple" size={32} />
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 font-montserrat">Editar Evento</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Titulo</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Descricao</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Categoria</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
            >
              <option value="draft">Rascunho</option>
              <option value="active">Ativo</option>
              <option value="sold_out">Esgotado</option>
              <option value="closed">Encerrado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Data</label>
            <input
              type="date"
              name="event_date"
              value={form.event_date}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Horario Inicio</label>
            <input
              type="time"
              name="start_time"
              value={form.start_time}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Horario Fim</label>
            <input
              type="time"
              name="end_time"
              value={form.end_time}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Local</label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Capacidade</label>
            <input
              type="number"
              name="capacity"
              value={form.capacity}
              onChange={handleChange}
              min={1}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Preco (R$)</label>
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              min={0}
              step={0.01}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Vagas meia-entrada</label>
            <input
              type="number"
              name="half_price"
              value={form.half_price}
              onChange={handleChange}
              min={0}
              step={1}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
            />
            <p className="mt-1 text-xs text-gray-400">Quantidade de inscrições com 50% de desconto disponíveis</p>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Imagem</label>
            {form.image_url && (
              <p className="mb-2 text-xs text-gray-400">Imagem atual definida. Envie uma nova para substituir.</p>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-purple/10 file:px-3 file:py-1 file:text-sm file:text-purple"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin/eventos')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-purple px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-dark disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}
