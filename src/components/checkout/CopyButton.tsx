'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function CopyButton({
  text,
  label = 'Copiar',
}: {
  text: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors"
      style={{
        background: copied ? 'var(--verde-600)' : 'var(--azul)',
        color: 'white',
      }}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? 'Copiado!' : label}
    </button>
  )
}
