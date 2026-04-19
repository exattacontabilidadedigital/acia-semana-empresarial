'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2 } from 'lucide-react'
import ModalPortal from '@/components/ui/ModalPortal'

interface EventOption {
  id: number
  title: string
}

interface ManualInscriptionModalProps {
  events: EventOption[]
}

export default function ManualInscriptionModal({ events }: ManualInscriptionModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null)

  const [form, setForm] = useState({
    event_id: '',
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    quantity: 1,
    is_half_price: false,
    payment_status: 'confirmed' as 'confirmed' | 'free' | 'pending',
  })

  function resetForm() {
    setForm({
      event_id: '',
      nome: '',
      email: '',
      cpf: '',
      telefone: '',
      quantity: 1,
      is_half_price: false,
      payment_status: 'confirmed',
    })
    setFeedback(null)
  }

  function handleOpen() {
    resetForm()
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    setFeedback(null)
  }

  function formatCPFInput(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
    if (digits.length <= 9)
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
  }

  function formatPhoneInput(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return digits
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/admin/inscriptions/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: Number(form.event_id),
          nome: form.nome.trim(),
          email: form.email.trim(),
          cpf: form.cpf.replace(/\D/g, ''),
          telefone: form.telefone.replace(/\D/g, ''),
          quantity: form.quantity,
          is_half_price: form.is_half_price,
          payment_status: form.payment_status,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setFeedback({ success: true, message: data.message || 'Inscrição criada com sucesso!' })
        setTimeout(() => {
          router.refresh()
          handleClose()
        }, 2000)
      } else {
        const errorMsg = data.details
          ? Object.values(data.details).flat().join(', ')
          : data.error || 'Erro ao criar inscrição'
        setFeedback({ success: false, message: errorMsg })
      }
    } catch {
      setFeedback({ success: false, message: 'Erro de conexão' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-lg bg-purple px-4 py-2 text-sm font-medium text-white hover:bg-purple-dark transition-colors"
      >
        <Plus size={16} />
        Nova Inscrição
      </button>

      {open && (
        <ModalPortal>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={handleClose}
        >
          <div
            className="mx-4 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple to-purple-dark p-5 rounded-t-lg flex items-center justify-between z-10">
              <div>
                <p className="text-xs text-white/70 uppercase tracking-wide">Admin</p>
                <p className="text-white font-bold text-lg">Nova Inscrição Manual</p>
              </div>
              <button onClick={handleClose} className="text-white/70 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Feedback */}
              {feedback && (
                <div
                  className={`rounded-lg px-4 py-3 text-sm font-medium ${
                    feedback.success
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {feedback.message}
                </div>
              )}

              {/* Evento */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Evento <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.event_id}
                  onChange={(e) => setForm({ ...form, event_id: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
                >
                  <option value="">Selecione o evento</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nome */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nome completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Nome do participante"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
                />
              </div>

              {/* CPF e Telefone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    CPF <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: formatCPFInput(e.target.value) })}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Telefone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.telefone}
                    onChange={(e) =>
                      setForm({ ...form, telefone: formatPhoneInput(e.target.value) })
                    }
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
                  />
                </div>
              </div>

              {/* Quantidade e Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Quantidade</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: Math.max(1, Number(e.target.value)) })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 pb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_half_price}
                      onChange={(e) => setForm({ ...form, is_half_price: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-purple focus:ring-purple"
                    />
                    <span className="text-sm text-gray-700">Meia-entrada</span>
                  </label>
                </div>
              </div>

              {/* Status de Pagamento */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Status do Pagamento
                </label>
                <select
                  value={form.payment_status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      payment_status: e.target.value as 'confirmed' | 'free' | 'pending',
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
                >
                  <option value="confirmed">Confirmado</option>
                  <option value="free">Gratuito</option>
                  <option value="pending">Pendente</option>
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  {form.payment_status === 'confirmed' || form.payment_status === 'free'
                    ? 'QR code e ingressos serão gerados automaticamente.'
                    : 'Nenhum ingresso será gerado até a confirmação.'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-purple px-4 py-2 text-sm font-medium text-white hover:bg-purple-dark disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Criar Inscrição
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </>
  )
}
