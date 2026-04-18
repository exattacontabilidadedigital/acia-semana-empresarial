'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X, ShoppingCart, ArrowRight } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'

const PAGES = [
  { href: '/', label: 'Início' },
  { href: '/sobre', label: 'Sobre' },
  { href: '/edicoes', label: 'Edições' },
  { href: '/parceiros', label: 'Parceiros' },
  { href: '/expositores', label: 'Expositores' },
  { href: '/inscricoes', label: 'Inscrições' },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { cartCount } = useCart()
  const pathname = usePathname()

  return (
    <nav
      className="sticky top-0 z-50 border-b border-line"
      style={{
        background: 'rgba(250, 250, 247, 0.85)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      <div className="container-site flex items-center justify-between h-[72px]">
        <Link href="/" className="flex items-center cursor-pointer">
          <Image
            src="/site/logo-semana-nav.png"
            alt="Semana Empresarial Açailândia"
            width={144}
            height={48}
            className="h-12 w-auto block"
            priority
          />
        </Link>

        <div className="hidden lg:flex gap-1 items-center">
          {PAGES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className={`nav-link ${isActive(pathname, p.href) ? 'active' : ''}`}
            >
              {p.label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <Link
            href="/carrinho"
            className="nav-link relative inline-flex items-center"
            aria-label="Carrinho"
          >
            <ShoppingCart size={18} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-laranja text-white text-[10px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>
          <Link
            href="/inscricoes/minhas"
            className="nav-link"
            style={{ fontSize: 13 }}
          >
            Minhas inscrições
          </Link>
          <Link
            href="/inscricoes"
            className="nav-cta"
            style={{ background: 'transparent', color: 'var(--laranja)' }}
          >
            Garantir ingresso
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="lg:hidden flex items-center gap-3">
          <Link href="/carrinho" className="relative text-ink" aria-label="Carrinho">
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-laranja text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>
          <button
            className="text-ink"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-line bg-paper">
          <div className="container-site py-4 flex flex-col gap-1">
            {PAGES.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className={`nav-link text-left ${isActive(pathname, p.href) ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                {p.label}
              </Link>
            ))}
            <Link
              href="/inscricoes/minhas"
              className="nav-link text-left"
              onClick={() => setMobileOpen(false)}
            >
              Minhas inscrições
            </Link>
            <Link
              href="/inscricoes"
              className="btn btn-primary mt-2 self-start"
              onClick={() => setMobileOpen(false)}
            >
              Garantir ingresso
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
