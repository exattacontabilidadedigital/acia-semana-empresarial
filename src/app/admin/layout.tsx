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
  Video as VideoIcon,
  Clock,
  ScrollText,
  Inbox,
  Award,
  PenTool,
  Mail as MailIcon,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UserCog,
  Bot,
  Settings,
  Activity,
  XCircle as XCircleIcon,
  ClipboardList,
  LayoutTemplate,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { getNewLeadsCount } from '@/app/admin/leads-patrocinio/actions'
import { getPendingExhibitorsCount } from '@/app/admin/expositores/actions'

type BadgeKey = 'new_leads' | 'pending_exhibitors'
type NavLeaf = {
  href: string
  label: string
  icon: LucideIcon
  badgeKey?: BadgeKey
}
type NavGroup = {
  id: string
  label: string
  icon: LucideIcon
  children: NavLeaf[]
  badgeKey?: BadgeKey
}
type NavEntry = NavLeaf | NavGroup

const isGroup = (entry: NavEntry): entry is NavGroup =>
  (entry as NavGroup).children !== undefined

// Marca um filho como ativo só se ele for o match mais específico no grupo.
// Evita que `/admin/expositores` (Inscrições) também acenda quando estamos
// em `/admin/expositores/pagina`.
function isChildPathActive(
  pathname: string,
  child: NavLeaf,
  siblings: NavLeaf[],
): boolean {
  if (!pathname.startsWith(child.href)) return false
  return !siblings.some(
    (s) => s !== child && s.href.length > child.href.length && pathname.startsWith(s.href),
  )
}

const navItems: NavEntry[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/eventos', label: 'Eventos', icon: Calendar },
  { href: '/admin/inscricoes', label: 'Inscrições', icon: Users },
  { href: '/admin/cancelamentos', label: 'Cancelamentos', icon: XCircleIcon },
  { href: '/admin/cupons', label: 'Cupons', icon: Ticket },
  { href: '/admin/associados', label: 'Associados', icon: Briefcase },
  { href: '/admin/checkin', label: 'Check-in', icon: QrCode },
  { href: '/admin/checkin/live', label: 'Check-in ao vivo', icon: Activity },
  {
    id: 'expositores',
    label: 'Expositores',
    icon: Store,
    badgeKey: 'pending_exhibitors',
    children: [
      {
        href: '/admin/expositores',
        label: 'Inscrições',
        icon: ClipboardList,
        badgeKey: 'pending_exhibitors',
      },
      {
        href: '/admin/expositores/pagina',
        label: 'Página de Expositores',
        icon: LayoutTemplate,
      },
    ],
  },
  { href: '/admin/certificados', label: 'Certificados', icon: Award },
  { href: '/admin/usuarios', label: 'Usuários', icon: UserCog },
  { href: '/admin/relatorios', label: 'Relatórios', icon: BarChart3 },
  {
    id: 'parceiros',
    label: 'Parceiros',
    icon: Building2,
    badgeKey: 'new_leads',
    children: [
      { href: '/admin/parceiros', label: 'Organizações', icon: Building2 },
      {
        href: '/admin/leads-patrocinio',
        label: 'Leads de patrocínio',
        icon: Inbox,
        badgeKey: 'new_leads',
      },
    ],
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: Settings,
    children: [
      { href: '/admin/edicoes', label: 'Edições', icon: Clock },
      { href: '/admin/galeria', label: 'Galeria', icon: ImageIcon },
      { href: '/admin/videos', label: 'Vídeos', icon: VideoIcon },
      { href: '/admin/configuracoes/assinaturas', label: 'Assinaturas', icon: PenTool },
      { href: '/admin/configuracoes/smtp', label: 'Email (SMTP)', icon: MailIcon },
      { href: '/admin/legal', label: 'Termos & LGPD', icon: ScrollText },
      { href: '/admin/chat-conhecimento', label: 'Conhecimento (Aci)', icon: Bot },
    ],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [newLeadsCount, setNewLeadsCount] = useState(0)
  const [pendingExhibitorsCount, setPendingExhibitorsCount] = useState(0)
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const supabase = createClient()

  const badges: Record<BadgeKey, number> = {
    new_leads: newLeadsCount,
    pending_exhibitors: pendingExhibitorsCount,
  }

  useEffect(() => {
    const saved = localStorage.getItem('admin_sidebar_collapsed')
    if (saved === 'true') setCollapsed(true)
    try {
      const savedGroups = localStorage.getItem('admin_sidebar_groups')
      if (savedGroups) setOpenGroups(JSON.parse(savedGroups))
    } catch {
      /* ignore */
    }
  }, [])

  // Polling dos contadores de notificação (leads + expositores pendentes).
  // Refaz: na montagem, ao mudar de rota, ao voltar pra aba e a cada 60s.
  useEffect(() => {
    let cancelled = false
    async function refresh() {
      try {
        const [leads, exhibitors] = await Promise.all([
          getNewLeadsCount(),
          getPendingExhibitorsCount(),
        ])
        if (cancelled) return
        setNewLeadsCount(leads)
        setPendingExhibitorsCount(exhibitors)
      } catch {
        /* ignore */
      }
    }
    refresh()
    const interval = setInterval(refresh, 60000)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [pathname])

  // Auto-expande grupo quando um filho está ativo
  useEffect(() => {
    for (const entry of navItems) {
      if (isGroup(entry)) {
        const childActive = entry.children.some((c) =>
          pathname.startsWith(c.href),
        )
        if (childActive && !openGroups[entry.id]) {
          setOpenGroups((prev) => ({ ...prev, [entry.id]: true }))
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      try {
        localStorage.setItem('admin_sidebar_groups', JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

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

        {/* Identidade do perfil — diferencia visualmente do portal de parceiros */}
        {!collapsed && (
          <div className="px-5 mt-1 mb-2 hidden lg:block">
            <span
              className="mono inline-flex items-center px-2 py-0.5 rounded-full text-[9px] tracking-[0.14em] font-medium uppercase"
              style={{
                background: 'rgba(248,130,30,0.16)',
                color: 'var(--laranja)',
                border: '1px solid rgba(248,130,30,0.3)',
              }}
            >
              Administrador · ACIA
            </span>
          </div>
        )}

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
          {navItems.map((entry) => {
            if (!isGroup(entry)) {
              const isActive = pathname.startsWith(entry.href)
              const badge = entry.badgeKey ? badges[entry.badgeKey] : 0
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  onClick={() => setSidebarOpen(false)}
                  title={collapsed ? entry.label : undefined}
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
                  <span className="relative flex-shrink-0">
                    <entry.icon
                      size={18}
                      style={isActive ? { color: 'var(--laranja)' } : undefined}
                    />
                    {badge > 0 && collapsed && <DotIndicator />}
                  </span>
                  <span className={cn('flex-1', collapsed && 'lg:hidden')}>
                    {entry.label}
                  </span>
                  {badge > 0 && !collapsed && <CountBadge value={badge} />}
                </Link>
              )
            }

            // Grupo (ex.: Configurações)
            const anyChildActive = entry.children.some((c) =>
              pathname.startsWith(c.href),
            )
            const isOpen = !!openGroups[entry.id] || anyChildActive

            // Modo contraído: mostra filhos como ícones soltos (sem cabeçalho do grupo)
            if (collapsed) {
              return (
                <div key={entry.id} className="hidden lg:block">
                  {entry.children.map((child) => {
                    const isActive = isChildPathActive(pathname, child, entry.children)
                    const childBadge = child.badgeKey ? badges[child.badgeKey] : 0
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setSidebarOpen(false)}
                        title={child.label}
                        className={cn(
                          'group relative flex items-center justify-center gap-3 rounded-lg px-0 py-2.5 text-sm font-medium transition-all',
                          isActive
                            ? 'text-white'
                            : 'text-white/60 hover:text-white hover:bg-white/5',
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
                        <span className="relative flex-shrink-0">
                          <child.icon
                            size={18}
                            style={isActive ? { color: 'var(--laranja)' } : undefined}
                          />
                          {childBadge > 0 && <DotIndicator />}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )
            }

            const groupBadge = entry.badgeKey ? badges[entry.badgeKey] : 0

            return (
              <div key={entry.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(entry.id)}
                  className={cn(
                    'group w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    anyChildActive
                      ? 'text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5',
                  )}
                >
                  <entry.icon
                    size={18}
                    className="flex-shrink-0"
                    style={
                      anyChildActive ? { color: 'var(--laranja)' } : undefined
                    }
                  />
                  <span className="flex-1 text-left">{entry.label}</span>
                  {groupBadge > 0 && !isOpen && <CountBadge value={groupBadge} />}
                  <ChevronDown
                    size={14}
                    className={cn(
                      'transition-transform',
                      isOpen ? 'rotate-0' : '-rotate-90',
                    )}
                  />
                </button>
                {isOpen && (
                  <div
                    className="ml-3 pl-3 space-y-0.5"
                    style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    {entry.children.map((child) => {
                      const isActive = isChildPathActive(pathname, child, entry.children)
                      const childBadge = child.badgeKey
                        ? badges[child.badgeKey]
                        : 0
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                            isActive
                              ? 'text-white'
                              : 'text-white/60 hover:text-white hover:bg-white/5',
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
                                height: 18,
                                background: 'var(--laranja)',
                              }}
                            />
                          )}
                          <child.icon
                            size={16}
                            className="flex-shrink-0"
                            style={isActive ? { color: 'var(--laranja)' } : undefined}
                          />
                          <span className="flex-1">{child.label}</span>
                          {childBadge > 0 && <CountBadge value={childBadge} />}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
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
          <span
            className="mono inline-flex items-center px-2 py-0.5 rounded-full text-[9px] tracking-[0.12em] font-medium uppercase"
            style={{
              background: 'rgba(248,130,30,0.12)',
              color: '#b85d00',
              border: '1px solid rgba(248,130,30,0.3)',
            }}
          >
            ACIA
          </span>
        </header>

        <main className="p-4 lg:p-10">{children}</main>
      </div>
    </div>
  )
}

function CountBadge({ value }: { value: number }) {
  const display = value > 99 ? '99+' : String(value)
  return (
    <span
      className="mono inline-flex items-center justify-center rounded-full text-[10px] font-bold leading-none"
      style={{
        background: 'var(--laranja)',
        color: 'white',
        minWidth: 18,
        height: 18,
        padding: '0 6px',
      }}
    >
      {display}
    </span>
  )
}

function DotIndicator() {
  return (
    <span
      className="absolute rounded-full"
      style={{
        top: -2,
        right: -2,
        width: 8,
        height: 8,
        background: 'var(--laranja)',
        boxShadow: '0 0 0 2px var(--azul-900)',
      }}
    />
  )
}
