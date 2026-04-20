'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

interface DownloadPdfButtonProps {
  pdfUrl: string
  orderNumber: string
  variant?: 'compact' | 'full'
}

export function DownloadPdfButton({ pdfUrl, orderNumber, variant = 'full' }: DownloadPdfButtonProps) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await fetch(pdfUrl)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Não foi possível gerar o comprovante.')
        return
      }
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `comprovante-${orderNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      alert('Erro ao gerar o comprovante. Tente novamente.')
    } finally {
      setDownloading(false)
    }
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple text-white text-sm font-semibold hover:bg-purple-dark transition-colors disabled:opacity-60"
      >
        {downloading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Gerando PDF...
          </>
        ) : (
          <>
            <Download size={16} />
            Baixar comprovante (PDF)
          </>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="w-full flex items-center justify-center gap-2 bg-purple text-white rounded-full py-3 font-semibold text-sm hover:bg-purple-dark transition-colors disabled:opacity-60"
    >
      {downloading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          Gerando PDF...
        </>
      ) : (
        <>
          <Download size={16} />
          Baixar comprovante
        </>
      )}
    </button>
  )
}
