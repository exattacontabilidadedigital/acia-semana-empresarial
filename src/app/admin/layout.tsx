'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Ticket,
  QrCode,
  BarChart3,
  Building2,
  Store,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  UserCog,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/eventos', label: 'Eventos', icon: Calendar },
  { href: '/admin/inscricoes', label: 'Inscrições', icon: Users },
  { href: '/admin/cupons', label: 'Cupons', icon: Ticket },
  { href: '/admin/checkin', label: 'Check-in', icon: QrCode },
  { href: '/admin/expositores', label: 'Expositores', icon: Store },
  { href: '/admin/usuarios', label: 'Usuários', icon: UserCog },
  { href: '/admin/relatorios', label: 'Relatórios', icon: BarChart3 },
  { href: '/admin/parceiros', label: 'Parceiros', icon: Building2 },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // Persistir estado no localStorage
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

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-64'

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-purple-dark transition-all duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64',
          `lg:${sidebarWidth}`
        )}
        style={{ width: undefined }}
      >
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex flex-col bg-purple-dark transition-all duration-200',
            // Mobile: sempre w-64, controlado por translate
            'max-lg:w-64',
            sidebarOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
            // Desktop: controlado por collapsed
            'lg:translate-x-0',
            collapsed ? 'lg:w-[72px]' : 'lg:w-64'
          )}
        >
          {/* Logo + collapse toggle */}
          <div className="flex h-16 items-center justify-between px-4">
            <Link href="/admin/dashboard" className="flex items-center overflow-hidden">
              {collapsed ? (
                <span className="hidden lg:block text-white font-bold text-xl">SE</span>
              ) : (
                <Image
                  src="/img/logo_branca.png"
                  alt="Semana Empresarial"
                  width={140}
                  height={44}
                  className="h-[44px] w-auto object-contain"
                />
              )}
              <Image
                src="/img/logo_branca.png"
                alt="Semana Empresarial"
                width={140}
                height={44}
                className={cn('h-[44px] w-auto object-contain lg:hidden')}
              />
            </Link>
            <button
              onClick={toggleCollapsed}
              className="hidden lg:flex text-white/50 hover:text-white transition-colors"
              title={collapsed ? 'Expandir menu' : 'Contrair menu'}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-white lg:hidden"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white',
                    collapsed && 'lg:justify-center lg:px-0'
                  )}
                >
                  <item.icon size={20} className="flex-shrink-0" />
                  <span className={cn(collapsed && 'lg:hidden')}>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="border-t border-white/10 p-3">
            <button
              onClick={handleLogout}
              title={collapsed ? 'Sair' : undefined}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white',
                collapsed && 'lg:justify-center lg:px-0'
              )}
            >
              <LogOut size={20} className="flex-shrink-0" />
              <span className={cn(collapsed && 'lg:hidden')}>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn('transition-all duration-200', collapsed ? 'lg:pl-[72px]' : 'lg:pl-64')}>
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600"
          >
            <Menu size={24} />
          </button>
          <Image
            src="/img/logo_branca.png"
            alt="Semana Empresarial"
            width={120}
            height={38}
            className="h-[38px] w-auto object-contain invert"
          />
        </header>

        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
