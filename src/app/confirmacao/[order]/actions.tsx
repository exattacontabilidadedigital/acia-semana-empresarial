'use client'

import { useState } from 'react'
import { Download, Printer, Mail, Check, Loader2 } from 'lucide-react'

interface ConfirmacaoActionsProps {
  pdfUrl: string
  orderNumber: string
  email: string
  eventTitle: string
}

export default function ConfirmacaoActions({ pdfUrl, orderNumber, email, eventTitle }: ConfirmacaoActionsProps) {
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = pdfUrl
    document.body.appendChild(iframe)
    iframe.onload = () => {
      iframe.contentWindow?.print()
      setTimeout(() => document.body.removeChild(iframe), 1000)
    }
  }

  const handleSendEmail = async () => {
    setEmailSending(true)
    setEmailError('')
    try {
      const res = await fetch('/api/email/confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: orderNumber }),
      })
      const data = await res.json()
      if (data.success) {
        setEmailSent(true)
      } else {
        setEmailError('Não foi possível enviar o email')
      }
    } catch {
      setEmailError('Erro ao enviar email')
    } finally {
      setEmailSending(false)
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <button
          onClick={handleDownload}
          className="flex flex-col items-center justify-center gap-1.5 bg-purple text-white rounded-xl py-3 font-semibold text-xs hover:bg-purple-dark transition-colors"
        >
          <Download size={18} />
          Baixar PDF
        </button>

        <button
          onClick={handlePrint}
          className="flex flex-col items-center justify-center gap-1.5 bg-cyan text-white rounded-xl py-3 font-semibold text-xs hover:bg-cyan-dark transition-colors"
        >
          <Printer size={18} />
          Imprimir
        </button>

        <button
          onClick={handleSendEmail}
          disabled={emailSending || emailSent}
          className={`flex flex-col items-center justify-center gap-1.5 rounded-xl py-3 font-semibold text-xs transition-colors ${
            emailSent
              ? 'bg-green-500 text-white'
              : 'bg-orange text-white hover:bg-orange-dark'
          } disabled:opacity-70`}
        >
          {emailSending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : emailSent ? (
            <Check size={18} />
          ) : (
            <Mail size={18} />
          )}
          {emailSending ? 'Enviando...' : emailSent ? 'Enviado!' : 'Enviar Email'}
        </button>
      </div>

      {emailSent && (
        <p className="text-xs text-green-600 text-center mb-2">
          Confirmação enviada para <strong>{email}</strong>
        </p>
      )}
      {emailError && (
        <p className="text-xs text-red-500 text-center mb-2">{emailError}</p>
      )}
    </div>
  )
}
