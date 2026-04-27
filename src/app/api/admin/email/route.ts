import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { requireAdminApi } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi()
    if ('error' in auth) return auth.error

    const { action, event_id, subject, message, target } = await request.json()
    const supabase = createAdminClient()

    // ==================== EMAIL EM MASSA ====================
    if (action === 'blast') {
      if (!event_id || !subject || !message) {
        return NextResponse.json({ error: 'event_id, subject e message obrigatórios' }, { status: 400 })
      }

      // Buscar evento
      const { data: event } = await supabase
        .from('events')
        .select('title')
        .eq('id', event_id)
        .single()

      // Buscar inscrições do evento filtradas pelo target
      let query = supabase
        .from('inscriptions')
        .select('nome, email')
        .eq('event_id', event_id)

      if (target === 'confirmed') {
        query = query.in('payment_status', ['confirmed', 'free'])
      } else if (target === 'pending') {
        query = query.eq('payment_status', 'pending')
      } else {
        query = query.in('payment_status', ['confirmed', 'free', 'pending'])
      }

      const { data: inscriptions } = await query

      if (!inscriptions || inscriptions.length === 0) {
        return NextResponse.json({ error: 'Nenhum inscrito encontrado' }, { status: 404 })
      }

      // Deduplica por email
      const uniqueEmails = new Map<string, string>()
      for (const insc of inscriptions) {
        if (!uniqueEmails.has(insc.email)) {
          uniqueEmails.set(insc.email, insc.nome)
        }
      }

      let sent = 0
      let failed = 0

      for (const [email, nome] of Array.from(uniqueEmails.entries())) {
        try {
          await sendEmail({
            to: email,
            subject: `${subject} | Semana Empresarial 2026`,
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5fa;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#5B2D8E,#3D1A6E);padding:30px;border-radius:16px 16px 0 0;text-align:center;">
      <h1 style="color:white;font-size:14px;letter-spacing:2px;margin:0 0 8px;">SEMANA EMPRESARIAL 2026</h1>
      <h2 style="color:white;font-size:18px;margin:0;">${event?.title || 'Comunicado'}</h2>
    </div>
    <div style="background:white;padding:30px;border-radius:0 0 16px 16px;border:1px solid #e0e0e0;border-top:none;">
      <p style="font-size:16px;color:#2D2D2D;">Olá, <strong>${nome}</strong>!</p>
      <div style="color:#555;font-size:14px;line-height:1.8;white-space:pre-line;">${message}</div>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="font-size:11px;color:#aaa;text-align:center;">
        Semana Empresarial de Açailândia 2026<br>
        acia.aca@gmail.com | +55 99 98833-4432
      </p>
    </div>
  </div>
</body>
</html>`,
          })
          sent++
        } catch {
          failed++
        }
      }

      return NextResponse.json({
        success: true,
        message: `${sent} email(s) enviado(s)${failed > 0 ? `, ${failed} falha(s)` : ''}`,
        sent,
        failed,
        total: uniqueEmails.size,
      })
    }

    // ==================== LEMBRETE PENDENTES ====================
    if (action === 'reminder_pending') {
      if (!event_id) {
        return NextResponse.json({ error: 'event_id obrigatório' }, { status: 400 })
      }

      const { data: event } = await supabase
        .from('events')
        .select('title, event_date')
        .eq('id', event_id)
        .single()

      const { data: pendingInscriptions } = await supabase
        .from('inscriptions')
        .select('nome, email, order_number, total_amount, payment_url')
        .eq('event_id', event_id)
        .eq('payment_status', 'pending')

      if (!pendingInscriptions || pendingInscriptions.length === 0) {
        return NextResponse.json({ error: 'Nenhuma inscrição pendente' }, { status: 404 })
      }

      let sent = 0
      for (const insc of pendingInscriptions) {
        if (!insc.payment_url) continue
        try {
          await sendEmail({
            to: insc.email,
            subject: `Lembrete: Pagamento Pendente - ${event?.title} | Semana Empresarial 2026`,
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5fa;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#E8892F,#D47520);padding:30px;border-radius:16px 16px 0 0;text-align:center;">
      <h1 style="color:white;font-size:14px;letter-spacing:2px;margin:0 0 8px;">LEMBRETE DE PAGAMENTO</h1>
      <h2 style="color:white;font-size:18px;margin:0;">${event?.title || 'Evento'}</h2>
    </div>
    <div style="background:white;padding:30px;border-radius:0 0 16px 16px;border:1px solid #e0e0e0;border-top:none;">
      <p style="font-size:16px;color:#2D2D2D;">Olá, <strong>${insc.nome}</strong>!</p>
      <p style="color:#555;font-size:14px;">Identificamos que seu pagamento para o evento <strong>${event?.title}</strong> ainda está pendente.</p>
      <p style="color:#555;font-size:14px;">Valor: <strong>R$ ${insc.total_amount.toFixed(2)}</strong></p>
      <p style="color:#555;font-size:14px;">Pedido: <strong>${insc.order_number}</strong></p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${insc.payment_url}" style="display:inline-block;background:#E8892F;color:white;text-decoration:none;padding:14px 36px;border-radius:50px;font-weight:bold;font-size:14px;">
          Pagar Agora
        </a>
      </div>
      <p style="color:#888;font-size:12px;">Caso já tenha efetuado o pagamento, desconsidere este email.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="font-size:11px;color:#aaa;text-align:center;">
        Semana Empresarial de Açailândia 2026<br>
        acia.aca@gmail.com | +55 99 98833-4432
      </p>
    </div>
  </div>
</body>
</html>`,
          })
          sent++
        } catch {
          // continue
        }
      }

      return NextResponse.json({
        success: true,
        message: `${sent} lembrete(s) enviado(s)`,
        sent,
        total: pendingInscriptions.length,
      })
    }

    // ==================== LEMBRETE PRÉ-EVENTO ====================
    if (action === 'reminder_upcoming') {
      if (!event_id) {
        return NextResponse.json({ error: 'event_id obrigatório' }, { status: 400 })
      }

      const { data: event } = await supabase
        .from('events')
        .select('*')
        .eq('id', event_id)
        .single()

      if (!event) {
        return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
      }

      const { data: confirmedInscriptions } = await supabase
        .from('inscriptions')
        .select('nome, email')
        .eq('event_id', event_id)
        .in('payment_status', ['confirmed', 'free'])

      if (!confirmedInscriptions || confirmedInscriptions.length === 0) {
        return NextResponse.json({ error: 'Nenhuma inscrição confirmada' }, { status: 404 })
      }

      const eventDate = new Date(event.event_date).toLocaleDateString('pt-BR')
      const eventTime = event.start_time?.slice(0, 5) || ''

      let sent = 0
      const uniqueEmails = new Map<string, string>()
      for (const insc of confirmedInscriptions) {
        if (!uniqueEmails.has(insc.email)) {
          uniqueEmails.set(insc.email, insc.nome)
        }
      }

      for (const [email, nome] of Array.from(uniqueEmails.entries())) {
        try {
          await sendEmail({
            to: email,
            subject: `Lembrete: ${event.title} é amanhã! | Semana Empresarial 2026`,
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5fa;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#5B2D8E,#3D1A6E);padding:30px;border-radius:16px 16px 0 0;text-align:center;">
      <h1 style="color:white;font-size:14px;letter-spacing:2px;margin:0 0 8px;">LEMBRETE</h1>
      <h2 style="color:white;font-size:18px;margin:0;">${event.title}</h2>
    </div>
    <div style="background:white;padding:30px;border-radius:0 0 16px 16px;border:1px solid #e0e0e0;border-top:none;">
      <p style="font-size:16px;color:#2D2D2D;">Olá, <strong>${nome}</strong>!</p>
      <p style="color:#555;font-size:14px;">Estamos ansiosos para te ver no evento!</p>
      <div style="background:#f5f5fa;border-radius:12px;padding:20px;margin:20px 0;">
        <p style="margin:4px 0;font-size:13px;color:#555;">📅 Data: <strong>${eventDate}</strong></p>
        <p style="margin:4px 0;font-size:13px;color:#555;">🕐 Horário: <strong>${eventTime}${event.end_time ? ' - ' + event.end_time.slice(0, 5) : ''}</strong></p>
        ${event.location ? `<p style="margin:4px 0;font-size:13px;color:#555;">📍 Local: <strong>${event.location}</strong></p>` : ''}
      </div>
      <p style="color:#555;font-size:14px;">Não esqueça de levar seu QR Code para o check-in na entrada!</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="font-size:11px;color:#aaa;text-align:center;">
        Semana Empresarial de Açailândia 2026<br>
        acia.aca@gmail.com | +55 99 98833-4432
      </p>
    </div>
  </div>
</body>
</html>`,
          })
          sent++
        } catch {
          // continue
        }
      }

      return NextResponse.json({
        success: true,
        message: `${sent} lembrete(s) enviado(s)`,
        sent,
        total: uniqueEmails.size,
      })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[ADMIN EMAIL] Erro:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
