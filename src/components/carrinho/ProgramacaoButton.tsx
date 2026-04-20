'use client'

import Link from 'next/link'
import { ArrowRight, CalendarCheck2 } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'

type Variant = 'cyan' | 'primary'

interface ProgramacaoButtonProps {
  variant?: Variant
  size?: 'md' | 'lg'
}

export default function ProgramacaoButton({
  variant = 'cyan',
  size = 'md',
}: ProgramacaoButtonProps) {
  const { cartCount } = useCart()
  const hasItems = cartCount > 0

  const shadow =
    variant === 'cyan'
      ? '0 6px 18px rgba(86,198,208,0.35)'
      : '0 8px 22px rgba(248,130,30,0.35)'

  return (
    <Link
      href="/carrinho"
      className={`btn ${variant === 'cyan' ? 'btn-cyan' : 'btn-primary'} ${
        size === 'lg' ? 'btn-lg' : ''
      } programacao-cta ${hasItems ? 'is-active' : ''} inline-flex items-center gap-2`}
      style={{
        boxShadow: shadow,
        position: 'relative',
        lineHeight: 1,
      }}
    >
      <CalendarCheck2
        size={size === 'lg' ? 18 : 16}
        className="shrink-0"
        style={{ display: 'block' }}
      />
      <span className="leading-none">
        {hasItems
          ? `Ver minha programação (${cartCount})`
          : 'Minha programação'}
      </span>
      <ArrowRight
        size={size === 'lg' ? 18 : 16}
        className="shrink-0"
        style={{ display: 'block' }}
      />

      {hasItems && <span aria-hidden className="programacao-cta-pulse" />}

      <style jsx>{`
        :global(.programacao-cta) {
          transition:
            transform 0.22s ease,
            box-shadow 0.22s ease;
        }
        :global(.programacao-cta.is-active) {
          animation: programacao-bounce 1.6s ease-in-out infinite;
        }
        :global(.programacao-cta.is-active:hover) {
          animation-play-state: paused;
        }
        :global(.programacao-cta-pulse) {
          position: absolute;
          inset: -4px;
          border-radius: 999px;
          border: 2px solid
            ${variant === 'cyan' ? 'rgba(86,198,208,0.7)' : 'rgba(248,130,30,0.7)'};
          pointer-events: none;
          animation: programacao-pulse 1.8s ease-out infinite;
        }

        @keyframes programacao-bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-4px);
          }
          60% {
            transform: translateY(0);
          }
        }

        @keyframes programacao-pulse {
          0% {
            transform: scale(1);
            opacity: 0.7;
          }
          70% {
            transform: scale(1.12);
            opacity: 0;
          }
          100% {
            transform: scale(1.12);
            opacity: 0;
          }
        }
      `}</style>
    </Link>
  )
}
