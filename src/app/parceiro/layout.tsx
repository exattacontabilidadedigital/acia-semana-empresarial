import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getUserOrgs, getActiveOrg, ORG_ROLE_LABELS } from '@/lib/orgs'
import { PERMISSION_MAP } from '@/lib/permissions'
import ParceiroSidebar from '@/components/parceiro/ParceiroSidebar'
import OrgSwitcher from '@/components/parceiro/OrgSwitcher'

export const dynamic = 'force-dynamic'

export default async function ParceiroLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/parceiro/dashboard')

  const orgs = await getUserOrgs()
  const activeOrg = await getActiveOrg()

  // Sem org? Mostra um shell vazio com instrução
  if (!activeOrg) {
    return (
      <NoOrgShell email={user.email ?? ''}>{children}</NoOrgShell>
    )
  }

  const permissions = PERMISSION_MAP[activeOrg.role] ?? []

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--paper)', color: 'var(--ink)' }}
    >
      <ParceiroSidebar permissions={permissions} />

      <div className="lg:pl-64 transition-all duration-200">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 flex h-14 lg:h-16 items-center gap-3 px-4 lg:px-8"
          style={{
            background: 'var(--paper)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <div className="flex-1 min-w-0">
            <OrgSwitcher orgs={orgs} activeOrgId={activeOrg.id} />
          </div>
          <span
            className="mono hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[10px] tracking-[0.1em] font-medium uppercase"
            style={{
              background: 'rgba(248,130,30,0.12)',
              color: '#b85d00',
              border: '1px solid rgba(248,130,30,0.3)',
            }}
            title="Seu nível de acesso nesta organização"
          >
            Parceiro · {ORG_ROLE_LABELS[activeOrg.role]}
          </span>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              title="Sair"
              className="rounded-lg p-2 hover:bg-paper-2 transition-colors"
              style={{ color: 'var(--ink-50)' }}
            >
              <LogOut size={16} />
            </button>
          </form>
        </header>

        <main className="p-4 lg:p-10">{children}</main>
      </div>
    </div>
  )
}

function NoOrgShell({
  email,
  children,
}: {
  email: string
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'var(--paper)' }}
    >
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 flex"
        style={{ height: 6 }}
      >
        <span style={{ flex: 1, background: 'var(--laranja)' }} />
        <span style={{ flex: 1, background: 'var(--verde)' }} />
        <span style={{ flex: 1, background: 'var(--ciano)' }} />
        <span style={{ flex: 1, background: 'var(--azul)' }} />
      </div>
      <div
        className="relative w-full max-w-[480px] rounded-[20px] bg-white p-8 page-enter"
        style={{ border: '1px solid var(--line)' }}
      >
        <div className="eyebrow mb-3">
          <span className="dot" />
          PORTAL DO PARCEIRO
        </div>
        <h1 className="display" style={{ fontSize: 32 }}>
          Sem organização ativa
        </h1>
        <p className="mt-4" style={{ color: 'var(--ink-70)', fontSize: 15 }}>
          Você está logado como <strong>{email}</strong> mas ainda não está
          vinculado a nenhuma organização parceira ativa.
        </p>
        <p
          className="mt-3 text-sm"
          style={{ color: 'var(--ink-70)' }}
        >
          Se recebeu um convite por email, abra o link mágico. Caso contrário,
          peça ao administrador da plataforma para adicioná-lo.
        </p>
        <div className="mt-6 flex gap-3 flex-wrap">
          <Link href="/" className="btn btn-ghost">
            Ir para o site
          </Link>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className="btn btn-ghost">
              <LogOut size={14} /> Sair
            </button>
          </form>
        </div>
        <div className="hidden">{children}</div>
      </div>
    </div>
  )
}
