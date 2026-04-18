'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  RefreshCw,
  Send,
  Loader2,
  MoreVertical,
  X,
  Eye,
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  CreditCard,
  Calendar,
  Ticket,
  Hash,
  ShoppingCart,
} from 'lucide-react'

interface InscriptionData {
  id: number
  order_number: string
  nome: string
  email: string
  cpf: string
  telefone: string
  nome_empresa: string | null
  cargo: string | null
  cep: string | null
  rua: string | null
  numero: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  quantity: number
  is_half_price: boolean
  total_amount: number
  payment_status: string
  payment_id: string | null
  payment_url: string | null
  purchase_group: string | null
  coupon_id: number | null
  created_at: string
  event_title: string
}

interface InscriptionActionsProps {
  inscription: InscriptionData
}

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmado',
  free: 'Gratuito',
  pending: 'Pendente',
  failed: 'Falhou',
  refunded: 'Reembolsado',
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800',
  free: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
}

function formatCPF(cpf: string): string {
  const d = cpf.replace(/\D/g, '')
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function formatDate(d: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))
}

export default function InscriptionActions({ inscription }: InscriptionActionsProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null)

  const isPending = inscription.payment_status === 'pending'

  async function handleAction(action: string) {
    setLoading(action)
    setFeedback(null)
    try {
      const res = await fetch('/api/admin/inscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, inscription_id: inscription.id }),
      })
      const data = await res.json()
      setFeedback({
        success: res.ok,
        message: data.message || data.error || 'Erro desconhecido',
      })
      if (res.ok) {
        setTimeout(() => {
          router.refresh()
          setMenuOpen(false)
          setFeedback(null)
        }, 1500)
      }
    } catch {
      setFeedback({ success: false, message: 'Erro de conexão' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      {/* Menu dropdown */}
      <div className="relative">
        <button
          onClick={() => { setMenuOpen(!menuOpen); setFeedback(null) }}
          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-purple"
        >
          {menuOpen ? <X size={16} /> : <MoreVertical size={16} />}
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-8 z-20 w-64 rounded-lg bg-white border border-gray-200 shadow-lg p-2">
            {feedback && (
              <div className={`mb-2 rounded-lg px-3 py-2 text-xs font-medium ${
                feedback.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {feedback.message}
              </div>
            )}

            {/* Detalhes */}
            <button
              onClick={() => { setDetailsOpen(true); setMenuOpen(false) }}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left text-gray-700 hover:bg-purple/5 hover:text-purple transition-colors"
            >
              <Eye size={14} />
              Ver detalhes
            </button>

            {/* Baixa manual */}
            {isPending && (
              <button
                onClick={() => handleAction('confirm_manual')}
                disabled={loading !== null}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors disabled:opacity-50"
              >
                {loading === 'confirm_manual' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Baixa manual (confirmar pgto)
              </button>
            )}

            {/* Sincronizar com Asaas */}
            {isPending && inscription.payment_id && (
              <button
                onClick={() => handleAction('sync_asaas')}
                disabled={loading !== null}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-50"
              >
                {loading === 'sync_asaas' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Verificar status no Asaas
              </button>
            )}

            {/* Reenviar link */}
            {isPending && inscription.payment_url && (
              <button
                onClick={() => handleAction('resend_link')}
                disabled={loading !== null}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors disabled:opacity-50"
              >
                {loading === 'resend_link' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Reenviar link de pagamento
              </button>
            )}

            {/* Link direto */}
            {inscription.payment_url && (
              <a
                href={inscription.payment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
              >
                <CreditCard size={14} />
                Abrir link de pagamento
              </a>
            )}
          </div>
        )}
      </div>

      {/* Modal de detalhes */}
      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDetailsOpen(false)}>
          <div className="mx-4 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple to-purple-dark p-5 rounded-t-lg flex items-center justify-between">
              <div>
                <p className="text-xs text-white/70 uppercase tracking-wide">Inscrição</p>
                <p className="text-white font-bold">{inscription.order_number}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  statusColors[inscription.payment_status] ?? 'bg-gray-100 text-gray-800'
                }`}>
                  {statusLabels[inscription.payment_status] ?? inscription.payment_status}
                </span>
                <button onClick={() => setDetailsOpen(false)} className="text-white/70 hover:text-white">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Evento */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Evento</p>
                <p className="text-sm font-semibold text-gray-900">{inscription.event_title}</p>
                <div className="flex gap-4 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Ticket size={12} />
                    {inscription.quantity}x {inscription.is_half_price ? 'meia-entrada' : 'inteira'}
                  </span>
                  <span className="flex items-center gap-1">
                    <CreditCard size={12} />
                    {formatCurrency(inscription.total_amount)}
                  </span>
                </div>
              </div>

              {/* Participante */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Participante</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <User size={14} className="text-gray-400" />
                    <span className="font-medium text-gray-900">{inscription.nome}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail size={14} className="text-gray-400" />
                    {inscription.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone size={14} className="text-gray-400" />
                    {formatPhone(inscription.telefone)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Hash size={14} className="text-gray-400" />
                    CPF: {formatCPF(inscription.cpf)}
                  </div>
                  {inscription.nome_empresa && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building2 size={14} className="text-gray-400" />
                      {inscription.nome_empresa}
                      {inscription.cargo && <span className="text-gray-400">— {inscription.cargo}</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Endereço */}
              {inscription.rua && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Endereço</p>
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin size={14} className="text-gray-400 mt-0.5" />
                    <div>
                      <p>{inscription.rua}, {inscription.numero}</p>
                      <p>{inscription.bairro} — {inscription.cidade}/{inscription.estado}</p>
                      {inscription.cep && <p className="text-xs text-gray-400">CEP: {inscription.cep}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Pagamento */}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Pagamento</p>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      statusColors[inscription.payment_status] ?? 'bg-gray-100 text-gray-800'
                    }`}>
                      {statusLabels[inscription.payment_status] ?? inscription.payment_status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Valor</span>
                    <span className="font-semibold">{formatCurrency(inscription.total_amount)}</span>
                  </div>
                  {inscription.payment_id && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">ID Asaas</span>
                      <span className="text-xs font-mono text-gray-600">{inscription.payment_id}</span>
                    </div>
                  )}
                  {inscription.purchase_group && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Grupo</span>
                      <span className="text-xs font-mono text-gray-600">{inscription.purchase_group}</span>
                    </div>
                  )}
                  {inscription.coupon_id && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cupom</span>
                      <span className="text-xs text-gray-600">ID #{inscription.coupon_id}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Data */}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Calendar size={12} />
                Inscrito em {formatDate(inscription.created_at)}
              </div>

              {/* Ações rápidas no modal */}
              {isPending && (
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Ações</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleAction('confirm_manual')}
                      disabled={loading !== null}
                      className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {loading === 'confirm_manual' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                      Baixa manual
                    </button>
                    {inscription.payment_id && (
                      <button
                        onClick={() => handleAction('sync_asaas')}
                        disabled={loading !== null}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading === 'sync_asaas' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        Verificar Asaas
                      </button>
                    )}
                    {inscription.payment_url && (
                      <button
                        onClick={() => handleAction('resend_link')}
                        disabled={loading !== null}
                        className="flex items-center gap-1.5 rounded-lg bg-orange px-3 py-2 text-xs font-semibold text-white hover:bg-orange-dark disabled:opacity-50"
                      >
                        {loading === 'resend_link' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        Reenviar link
                      </button>
                    )}
                  </div>
                  {feedback && (
                    <div className={`rounded-lg px-3 py-2 text-xs font-medium ${
                      feedback.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {feedback.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
