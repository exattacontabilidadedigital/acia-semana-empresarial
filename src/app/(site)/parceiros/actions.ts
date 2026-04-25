'use server'

import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

const TIER_LABELS: Record<string, string> = {
  master: 'Master',
  diamante: 'Diamante',
  ouro: 'Ouro',
  prata: 'Prata',
  bronze: 'Bronze',
  apoio: 'Apoio',
}

export type SubmitLeadResult =
  | { ok: true }
  | { ok: false; error: string }

export async function submitSponsorshipLeadAction(input: {
  nome: string
  empresa: string
  email: string
  telefone?: string
  cota: string
  mensagem: string
}): Promise<SubmitLeadResult> {
  const nome = input.nome?.trim() ?? ''
  const empresa = input.empresa?.trim() ?? ''
  const email = input.email?.trim().toLowerCase() ?? ''
  const telefone = input.telefone?.trim() || null
  const cota = input.cota?.trim() || null
  const mensagem = input.mensagem?.trim() || null

  if (!nome || nome.length < 2) {
    return { ok: false, error: 'Informe seu nome.' }
  }
  if (!empresa || empresa.length < 2) {
    return { ok: false, error: 'Informe o nome da empresa.' }
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'E-mail inválido.' }
  }

  const h = headers()
  const ip =
    h.get('x-forwarded-for')?.split(',')[0].trim() ||
    h.get('x-real-ip') ||
    null
  const userAgent = h.get('user-agent') || null

  const admin = createAdminClient()

  const { error } = await admin.from('sponsorship_leads').insert({
    name: nome,
    company: empresa,
    email,
    phone: telefone,
    tier: cota,
    message: mensagem,
    ip_address: ip,
    user_agent: userAgent,
  })

  if (error) {
    console.error('[sponsorship-lead] insert failed:', error)
    return {
      ok: false,
      error: 'Não foi possível enviar agora. Tente novamente em instantes.',
    }
  }

  // Notifica o time comercial — falha silenciosa se SMTP não configurado.
  const notifyTo = process.env.LEADS_NOTIFY_EMAIL || process.env.SMTP_FROM
  if (notifyTo) {
    const tierLabel = cota ? TIER_LABELS[cota] ?? cota : '—'
    sendEmail({
      to: notifyTo,
      subject: `[Patrocínio] Novo interesse — ${empresa} (${tierLabel})`,
      html: `
        <h2 style="font-family:system-ui">Novo lead de patrocínio</h2>
        <table style="font-family:system-ui;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 12px"><b>Nome</b></td><td style="padding:6px 12px">${escapeHtml(nome)}</td></tr>
          <tr><td style="padding:6px 12px"><b>Empresa</b></td><td style="padding:6px 12px">${escapeHtml(empresa)}</td></tr>
          <tr><td style="padding:6px 12px"><b>E-mail</b></td><td style="padding:6px 12px"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
          ${telefone ? `<tr><td style="padding:6px 12px"><b>Telefone</b></td><td style="padding:6px 12px">${escapeHtml(telefone)}</td></tr>` : ''}
          <tr><td style="padding:6px 12px"><b>Cota</b></td><td style="padding:6px 12px">${escapeHtml(tierLabel)}</td></tr>
          ${mensagem ? `<tr><td style="padding:6px 12px;vertical-align:top"><b>Mensagem</b></td><td style="padding:6px 12px;white-space:pre-wrap">${escapeHtml(mensagem)}</td></tr>` : ''}
        </table>
        <p style="font-family:system-ui;font-size:13px;color:#666;margin-top:24px">
          Acesse o painel para gerenciar este lead:<br>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/admin/leads-patrocinio">Abrir painel</a>
        </p>
      `,
    }).catch((e) => {
      console.error('[leads] erro ao enviar notificação:', e)
    })
  }

  return { ok: true }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
