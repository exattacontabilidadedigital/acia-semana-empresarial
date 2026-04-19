import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { acceptInvitation } from '@/lib/invitations'
import { ORG_TYPE_LABELS } from '@/lib/orgs'

export const dynamic = 'force-dynamic'

type InviteRow = {
  id: string
  organization_id: string
  email: string
  role: 'owner' | 'member'
  expires_at: string
  accepted_at: string | null
  organizations: {
    name: string
    type: string
    logo_url: string | null
  } | null
}

async function loadInvite(token: string): Promise<InviteRow | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('organization_invitations')
    .select(
      'id, organization_id, email, role, expires_at, accepted_at, organizations:organization_id ( name, type, logo_url )'
    )
    .eq('token', token)
    .maybeSingle()
  return (data as unknown as InviteRow) ?? null
}

export default async function AcceptInvitePage({
  params,
  searchParams,
}: {
  params: { token: string }
  searchParams: { error?: string }
}) {
  const invite = await loadInvite(params.token)

  // Estado: convite inválido
  if (!invite) {
    return (
      <Shell>
        <Card>
          <Heading eyebrow="CONVITE" title="Link inválido" />
          <p className="mt-4" style={{ color: 'var(--ink-70)', fontSize: 15 }}>
            Este convite não foi encontrado. Pode ter sido cancelado ou o link
            está incorreto.
          </p>
          <Link
            href="/login"
            className="btn btn-ghost mt-6 inline-flex"
          >
            Ir para login
          </Link>
        </Card>
      </Shell>
    )
  }

  // Estado: já aceito
  if (invite.accepted_at) {
    return (
      <Shell>
        <Card>
          <Heading eyebrow="CONVITE JÁ ACEITO" title="Tudo certo" />
          <p className="mt-4" style={{ color: 'var(--ink-70)', fontSize: 15 }}>
            Esse convite já foi aceito anteriormente. Faça login para acessar
            o portal do parceiro.
          </p>
          <Link
            href="/login?redirect=/parceiro/dashboard"
            className="btn btn-orange btn-lg mt-6 inline-flex"
          >
            Entrar <ArrowRight size={16} />
          </Link>
        </Card>
      </Shell>
    )
  }

  // Estado: expirado
  if (new Date(invite.expires_at) < new Date()) {
    return (
      <Shell>
        <Card>
          <Heading eyebrow="CONVITE EXPIRADO" title="Link vencido" />
          <p className="mt-4" style={{ color: 'var(--ink-70)', fontSize: 15 }}>
            Esse convite expirou em{' '}
            {new Date(invite.expires_at).toLocaleDateString('pt-BR')}. Peça
            ao administrador da organização para enviar um novo convite.
          </p>
        </Card>
      </Shell>
    )
  }

  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Estado: precisa logar
  if (!user) {
    return (
      <Shell>
        <Card>
          <Heading
            eyebrow="VOCÊ FOI CONVIDADO"
            title={invite.organizations?.name ?? 'Organização'}
          />
          <p className="mt-4" style={{ color: 'var(--ink-70)', fontSize: 15 }}>
            Você foi convidado como{' '}
            <strong style={{ color: 'var(--ink)' }}>
              {invite.role === 'owner' ? 'Owner' : 'Membro'}
            </strong>{' '}
            de{' '}
            <strong style={{ color: 'var(--ink)' }}>
              {invite.organizations?.name}
            </strong>
            {invite.organizations?.type
              ? ` (${ORG_TYPE_LABELS[invite.organizations.type] ?? ''})`
              : ''}
            .
          </p>
          <p
            className="mt-3 mono text-[11px] tracking-[0.06em]"
            style={{ color: 'var(--ink-50)' }}
          >
            Email do convite: <strong>{invite.email}</strong>
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/login?redirect=/convite/${params.token}`}
              className="btn btn-orange btn-lg inline-flex"
            >
              Entrar para aceitar <ArrowRight size={16} />
            </Link>
          </div>
          <p
            className="mt-4 text-xs"
            style={{ color: 'var(--ink-50)' }}
          >
            Se você acabou de receber o email, ele já contém um link mágico que
            faz login automaticamente — basta clicar nele.
          </p>
        </Card>
      </Shell>
    )
  }

  // Estado: email do convite ≠ email do user logado
  if (
    user.email &&
    invite.email.toLowerCase() !== user.email.toLowerCase()
  ) {
    return (
      <Shell>
        <Card>
          <Heading eyebrow="ATENÇÃO" title="Conta diferente" />
          <p className="mt-4" style={{ color: 'var(--ink-70)', fontSize: 15 }}>
            O convite é para <strong>{invite.email}</strong>, mas você está
            logado como <strong>{user.email}</strong>. Faça logout e entre com
            o email correto.
          </p>
          <form action="/api/auth/signout" method="post" className="mt-6">
            <button type="submit" className="btn btn-ghost">
              Fazer logout
            </button>
          </form>
        </Card>
      </Shell>
    )
  }

  // Aceita o convite
  const result = await acceptInvitation({
    token: params.token,
    userId: user.id,
    userEmail: user.email ?? invite.email,
  })

  if (result.error) {
    return (
      <Shell>
        <Card>
          <Heading eyebrow="ERRO" title="Não foi possível aceitar" />
          <p className="mt-4" style={{ color: 'var(--ink-70)', fontSize: 15 }}>
            {result.error}
          </p>
        </Card>
      </Shell>
    )
  }

  redirect('/parceiro/dashboard')
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
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
      <div className="relative w-full flex items-center justify-center py-16 px-4">
        {children}
      </div>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-full max-w-[480px] rounded-[20px] bg-white p-8 page-enter"
      style={{
        border: '1px solid var(--line)',
        boxShadow: '0 20px 60px -30px rgba(20,20,60,0.15)',
      }}
    >
      {children}
    </div>
  )
}

function Heading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      <div className="eyebrow mb-3">
        <span className="dot" />
        {eyebrow}
      </div>
      <h1 className="display" style={{ fontSize: 'clamp(28px, 5vw, 38px)' }}>
        {title}
      </h1>
    </>
  )
}
