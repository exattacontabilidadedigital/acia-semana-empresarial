'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

type Slots = { open: number; closed: number }

export default function InscricaoQuickCard({
  title,
  date,
  price,
  color,
  slots,
}: {
  title: string
  date: string
  price: string
  color: string
  slots?: Slots
}) {
  const [hover, setHover] = useState(false)

  return (
    <Link
      href="/inscricoes"
      className="block bg-white rounded-2xl p-5 text-left transition-all relative overflow-hidden border"
      style={{
        borderColor: hover ? color : 'var(--line)',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex justify-between items-start mb-3">
        <span
          className="w-2.5 h-2.5 rounded-full block"
          style={{ background: color }}
        />
        <span className="mono text-[10px] text-ink-50 tracking-[0.1em]">{date}</span>
      </div>
      <div className="text-base font-semibold tracking-[-0.01em] mb-2">{title}</div>
      {slots ? (
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-semibold" style={{ color: 'var(--verde-600)' }}>
              Gratuito
            </span>
            <ArrowRight size={14} />
          </div>
          <div className="flex gap-2.5 text-[11px] text-ink-50 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--verde-600)' }}
              />
              {slots.open} com vagas
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--ink-50)', opacity: 0.4 }}
              />
              {slots.closed} sem vagas
            </span>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center">
          <span
            className="text-[13px] font-semibold"
            style={{ color: price === 'Gratuito' ? 'var(--verde-600)' : 'var(--ink)' }}
          >
            {price}
          </span>
          <ArrowRight size={14} />
        </div>
      )}
    </Link>
  )
}
