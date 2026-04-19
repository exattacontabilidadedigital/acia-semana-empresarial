'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  Users,
  QrCode,
  UsersRound,
  Settings,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  ownerOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/parceiro/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/parceiro/eventos', label: 'Meus Eventos', icon: Calendar },
  { href: '/parceiro/inscricoes', label: 'Inscrições', icon: Users },
  { href: '/parceiro/checkin', label: 'Check-in', icon: QrCode },
  { href: '/parceiro/equipe', label: 'Equipe', icon: UsersRound, ownerOnly: true },
  { href: '/parceiro/configuracoes', label: 'Configurações', icon: Settings, ownerOnly: true },
]

export default function ParceiroSidebar({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const items = NAV_ITEMS.filter((i) => !i.ownerOnly || isOwner)

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-3 left-3 z-40 lg:hidden p-2 rounded-lg"
        style={{ background: 'var(--paper)', color: 'var(--ink)' }}
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(10,12,40,0.55)' }}
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-200 w-64',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0'
        )}
        style={{
          background: 'var(--azul-900)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Brand stripe */}
        <div className="flex" style={{ height: 3 }}>
          <span style={{ flex: 1, background: 'var(--laranja)' }} />
          <span style={{ flex: 1, background: 'var(--verde)' }} />
          <span style={{ flex: 1, background: 'var(--ciano)' }} />
          <span style={{ flex: 1, background: 'var(--azul)' }} />
        </div>

        {/* Brand */}
        <div className="flex h-16 items-center justify-between px-5">
          <Link
            href="/parceiro/dashboard"
            className="flex items-center gap-2 overflow-hidden"
          >
            <span
              className="grid place-items-center rounded-md text-white font-extrabold shrink-0"
              style={{
                width: 32,
                height: 32,
                background: 'var(--laranja)',
                fontSize: 14,
                letterSpacing: '-0.04em',
              }}
            >
              SE
            </span>
            <span
              className="display text-white text-base whitespace-nowrap"
              style={{ letterSpacing: '-0.02em' }}
            >
              Parceiro
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-white lg:hidden"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Eyebrow */}
        <div
          className="mono px-5 mt-3 mb-2 hidden lg:block"
          style={{
            fontSize: 10,
            letterSpacing: '0.14em',
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          NAVEGAÇÃO
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-2 overflow-y-auto">
          {items.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                )}
                style={
                  isActive
                    ? { background: 'rgba(248,130,30,0.18)' }
                    : undefined
                }
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                    style={{
                      width: 3,
                      height: 20,
                      background: 'var(--laranja)',
                    }}
                  />
                )}
                <item.icon
                  size={18}
                  className="flex-shrink-0"
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
