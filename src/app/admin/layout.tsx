'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Ticket,
  QrCode,
  BarChart3,
  Building2,
  Briefcase,
  Store,
  Image as ImageIcon,
  Clock,
  ScrollText,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  UserCog,
  Bot,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/eventos', label: 'Eventos', icon: Calendar },
  { href: '/admin/inscricoes', label: 'Inscrições', icon: Users },
  { href: '/admin/cupons', label: 'Cupons', icon: Ticket },
  { href: '/admin/associados', label: 'Associados', icon: Briefcase },
  { href: '/admin/checkin', label: 'Check-in', icon: QrCode },
  { href: '/admin/expositores', label: 'Expositores', icon: Store },
  { href: '/admin/usuarios', label: 'Usuários', icon: UserCog },
  { href: '/admin/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/admin/parceiros', label: 'Parceiros', icon: Building2 },
  { href: '/admin/edicoes', label: 'Edições', icon: Clock },
  { href: '/admin/galeria', label: 'Galeria', icon: ImageIcon },
  { href: '/admin/legal', label: 'Termos & LGPD', icon: ScrollText },
  { href: '/admin/chat-conhecimento', label: 'Conhecimento (Aci)', icon: Bot },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const saved = localStorage.getItem('admin_sidebar_collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('admin_sidebar_collapsed', String(next))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--paper)', color: 'var(--ink)' }}
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(10,12,40,0.55)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-200',
          'max-lg:w-64',
          sidebarOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
          'lg:translate-x-0',
          collapsed ? 'lg:w-[72px]' : 'lg:w-64'
        )}
        style={{
          background: 'var(--azul-900)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Brand stripe (top) */}
        <div className="flex" style={{ height: 3 }}>
          <span style={{ flex: 1, background: 'var(--laranja)' }} />
          <span style={{ flex: 1, background: 'var(--verde)' }} />
          <span style={{ flex: 1, background: 'var(--ciano)' }} />
          <span style={{ flex: 1, background: 'var(--azul)' }} />
        </div>

        {/* Brand + collapse toggle */}
        <div className="flex h-16 items-center justify-between px-5">
          <Link
            href="/admin/dashboard"
            className={cn(
              'flex items-center gap-2 overflow-hidden',
              collapsed && 'lg:justify-center lg:w-full'
            )}
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
              className={cn(
                'display text-white text-base whitespace-nowrap',
                collapsed && 'lg:hidden'
              )}
              style={{ letterSpacing: '-0.02em' }}
            >
              Admin
            </span>
          </Link>
          <button
            onClick={toggleCollapsed}
            className={cn(
              'hidden lg:flex text-white/40 hover:text-white transition-colors',
              collapsed && 'lg:hidden'
            )}
            title="Contrair menu"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-white lg:hidden"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Eyebrow */}
        {!collapsed && (
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
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-3 py-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5',
                  collapsed && 'lg:justify-center lg:px-0'
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
                  style={isActive ? { color: 'var(--laranja)' } : undefined}
                />
                <span className={cn(collapsed && 'lg:hidden')}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom: expand toggle (when collapsed) + logout */}
        <div className="px-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {collapsed && (
            <button
              onClick={toggleCollapsed}
              className="hidden lg:flex w-full justify-center text-white/40 hover:text-white transition-colors mb-2"
              title="Expandir menu"
            >
              <ChevronRight size={16} />
            </button>
          )}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sair' : undefined}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white',
              collapsed && 'lg:justify-center lg:px-0'
            )}
          >
            <LogOut size={18} className="flex-shrink-0" />
            <span className={cn(collapsed && 'lg:hidden')}>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div
        className={cn(
          'transition-all duration-200',
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        )}
      >
        {/* Mobile header */}
        <header
          className="sticky top-0 z-30 flex h-14 items-center gap-3 px-4 lg:hidden"
          style={{
            background: 'var(--paper)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1"
            style={{ color: 'var(--ink)' }}
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
          <span
            className="grid place-items-center rounded-md text-white font-extrabold"
            style={{
              width: 28,
              height: 28,
              background: 'var(--laranja)',
              fontSize: 12,
            }}
          >
            SE
          </span>
          <span
            className="display text-base"
            style={{ color: 'var(--ink)', letterSpacing: '-0.02em' }}
          >
            Admin
          </span>
        </header>

        <main className="p-4 lg:p-10">{children}</main>
      </div>
    </div>
  )
}
