'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Save } from 'lucide-react'

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

export default function NovoEventoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
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
  })

  const [imageFile, setImageFile] = useState<File | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: ['capacity', 'price', 'half_price'].includes(name) ? Number(value) : value,
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      let image_url: string | null = null

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

      const { error: insertError } = await supabase.from('events').insert({
        ...form,
        image_url,
        owner_id: user.id,
      })

      if (insertError) throw insertError

      router.push('/admin/eventos')
    } catch (err: any) {
      setError(err.message || 'Erro ao criar evento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 font-montserrat">Novo Evento</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Título */}
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

          {/* Descrição */}
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

          {/* Categoria */}
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

          {/* Status */}
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
            </select>
          </div>

          {/* Data */}
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

          {/* Horário Início */}
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

          {/* Horário Fim */}
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

          {/* Local */}
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

          {/* Capacidade */}
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

          {/* Preço */}
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

          {/* Vagas meia-entrada */}
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

          {/* Imagem */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Imagem</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-purple/10 file:px-3 file:py-1 file:text-sm file:text-purple"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-purple px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-dark disabled:opacity-50"
          >
            <Save size={18} />
            {loading ? 'Salvando...' : 'Criar Evento'}
          </button>
        </div>
      </form>
    </div>
  )
}
