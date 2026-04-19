'use client'

import { useState } from 'react'
import { Mail, X, Loader2, Send, Bell, CheckCircle } from 'lucide-react'
import ModalPortal from '@/components/ui/ModalPortal'

interface EmailBlastModalProps {
  eventId: number
  eventTitle: string
}

export default function EmailBlastModal({ eventId, eventTitle }: EmailBlastModalProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'blast' | 'reminder_pending' | 'reminder_upcoming'>('blast')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [target, setTarget] = useState<'all' | 'confirmed' | 'pending'>('confirmed')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null)

  async function handleSend() {
    setLoading(true)
    setFeedback(null)
    try {
      const body =
        tab === 'blast'
          ? { action: 'blast', event_id: eventId, subject, message, target }
          : { action: tab, event_id: eventId }

      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      setFeedback({
        success: res.ok,
        message: data.message || data.error || 'Erro desconhecido',
      })
    } catch {
      setFeedback({ success: false, message: 'Erro de conexão' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setFeedback(null) }}
        className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-purple"
        title="Enviar emails"
      >
        <Mail size={16} />
      </button>

      {open && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div className="mx-4 w-full max-w-lg rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Comunicação</h2>
                <p className="text-xs text-gray-500">{eventTitle}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-5">
              {/* Tabs */}
              <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setTab('blast')}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    tab === 'blast' ? 'bg-white text-purple shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Send size={12} />
                  Email personalizado
                </button>
                <button
                  onClick={() => setTab('reminder_pending')}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    tab === 'reminder_pending' ? 'bg-white text-orange shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Bell size={12} />
                  Cobrar pendentes
                </button>
                <button
                  onClick={() => setTab('reminder_upcoming')}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    tab === 'reminder_upcoming' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <CheckCircle size={12} />
                  Lembrete evento
                </button>
              </div>

              {/* Blast form */}
              {tab === 'blast' && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Destinatários</label>
                    <select
                      value={target}
                      onChange={(e) => setTarget(e.target.value as any)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="confirmed">Confirmados</option>
                      <option value="pending">Pendentes</option>
                      <option value="all">Todos</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Assunto</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Assunto do email..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Mensagem</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      placeholder="Conteúdo do email..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Reminder pending */}
              {tab === 'reminder_pending' && (
                <div className="bg-orange-50 rounded-lg p-4 text-sm text-orange-800">
                  <p className="font-semibold mb-1">Cobrar pagamentos pendentes</p>
                  <p className="text-xs">Envia um email para todos os inscritos com pagamento pendente, incluindo o link de pagamento.</p>
                </div>
              )}

              {/* Reminder upcoming */}
              {tab === 'reminder_upcoming' && (
                <div className="bg-green-50 rounded-lg p-4 text-sm text-green-800">
                  <p className="font-semibold mb-1">Lembrete pré-evento</p>
                  <p className="text-xs">Envia um lembrete para todos os inscritos confirmados com data, horário e local do evento.</p>
                </div>
              )}

              {/* Feedback */}
              {feedback && (
                <div className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  feedback.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {feedback.message}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Fechar
                </button>
                <button
                  onClick={handleSend}
                  disabled={loading || (tab === 'blast' && (!subject.trim() || !message.trim()))}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple px-4 py-2 text-sm font-medium text-white hover:bg-purple-dark disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {loading ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </>
  )
}
