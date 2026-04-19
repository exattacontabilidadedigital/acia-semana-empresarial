import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const registerSchema = z.object({
  company_name: z.string().min(2, 'Nome da empresa obrigatório'),
  cnpj: z.string().optional(),
  responsible_name: z.string().min(2, 'Nome do responsável obrigatório'),
  responsible_role: z.string().optional(),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  segment: z.string().min(1, 'Segmento obrigatório'),
  description: z.string().optional(),
  stand_size: z.string().optional(),
  stand_number: z.string().optional(),
  logo_url: z.string().nullable().optional(),
  // Quando true, o usuário confirmou que quer um cadastro adicional mesmo
  // existindo stand para o mesmo email/CNPJ (empresa comprando múltiplos stands).
  confirm_duplicate: z.boolean().optional(),
})

// POST - Cadastro público de expositor
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = registerSchema.parse(body)

    const supabase = createAdminClient()

    // Verifica duplicata por email OU CNPJ (se fornecido) quando o usuário
    // ainda não confirmou que quer um cadastro adicional.
    if (!data.confirm_duplicate) {
      const cnpjDigits = data.cnpj?.replace(/\D/g, '') || null

      let duplicateQuery = supabase
        .from('exhibitors')
        .select('id, status, company_name, email, cnpj, stand_number')
        .in('status', ['pending', 'approved'])

      if (cnpjDigits) {
        duplicateQuery = duplicateQuery.or(`email.eq.${data.email},cnpj.eq.${cnpjDigits}`)
      } else {
        duplicateQuery = duplicateQuery.eq('email', data.email)
      }

      const { data: existingRows } = await duplicateQuery.limit(1)
      const existing = existingRows?.[0]

      if (existing) {
        const matchedBy = existing.email === data.email ? 'email' : 'cnpj'
        const standInfo = existing.stand_number ? ` (stand ${existing.stand_number})` : ''
        const message = existing.status === 'approved'
          ? `Já existe um stand aprovado para este ${matchedBy === 'email' ? 'email' : 'CNPJ'}${standInfo} — empresa: ${existing.company_name}. Deseja reservar outro stand?`
          : `Já existe uma reserva pendente para este ${matchedBy === 'email' ? 'email' : 'CNPJ'}${standInfo} — empresa: ${existing.company_name}. Deseja reservar outro stand?`

        return NextResponse.json(
          {
            error: 'DUPLICATE_EXHIBITOR',
            message,
            existing: {
              id: existing.id,
              status: existing.status,
              company_name: existing.company_name,
              stand_number: existing.stand_number,
              matched_by: matchedBy,
            },
          },
          { status: 409 },
        )
      }
    }

    // Reserva atômica do stand (bloqueia condição de corrida entre dois clicks)
    if (data.stand_number) {
      const { data: claimed, error: claimError } = await supabase
        .from('stands')
        .update({ status: 'reserved' })
        .eq('number', data.stand_number)
        .eq('status', 'available')
        .select('id')

      if (claimError) {
        console.error('Erro ao reservar stand:', claimError)
        return NextResponse.json({ error: 'Erro ao reservar stand' }, { status: 500 })
      }
      if (!claimed || claimed.length === 0) {
        return NextResponse.json(
          { error: 'Este stand não está mais disponível. Escolha outro.' },
          { status: 400 }
        )
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from('exhibitors')
      .insert({
        company_name: data.company_name,
        cnpj: data.cnpj || null,
        responsible_name: data.responsible_name,
        responsible_role: data.responsible_role || null,
        email: data.email,
        phone: data.phone.replace(/\D/g, ''),
        segment: data.segment,
        description: data.description || null,
        stand_size: data.stand_size || 'indefinido',
        stand_number: data.stand_number || null,
        logo_url: data.logo_url || null,
        status: 'pending',
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Erro ao cadastrar expositor:', insertError)
      // Rollback: libera o stand se já havia sido reservado
      if (data.stand_number) {
        await supabase
          .from('stands')
          .update({ status: 'available', exhibitor_id: null })
          .eq('number', data.stand_number)
      }
      return NextResponse.json({ error: 'Erro ao realizar cadastro' }, { status: 500 })
    }

    // Vincula o expositor ao stand reservado
    if (data.stand_number && inserted) {
      await supabase
        .from('stands')
        .update({ exhibitor_id: inserted.id })
        .eq('number', data.stand_number)
    }

    return NextResponse.json({ success: true, message: 'Cadastro realizado com sucesso' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }
    console.error('Erro no cadastro de expositor:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// GET - Listar expositores (admin)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const supabase = createAdminClient()

    let query = supabase
      .from('exhibitors')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }
    if (search) {
      query = query.or(`company_name.ilike.%${search}%,responsible_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: exhibitors } = await query

    return NextResponse.json({ exhibitors: exhibitors ?? [] })
  } catch (error) {
    console.error('Erro ao listar expositores:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PATCH - Atualizar expositor (admin)
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, action, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
    }

    const supabase = createAdminClient()

    if (action === 'approve') {
      // Busca estado atual antes de aprovar
      const { data: current } = await supabase
        .from('exhibitors')
        .select('stand_number')
        .eq('id', id)
        .single()

      await supabase
        .from('exhibitors')
        .update({ status: 'approved', admin_notes: updates.admin_notes || null, stand_number: updates.stand_number || null })
        .eq('id', id)

      // Sincroniza stands: libera stand antigo se mudou, marca novo como sold
      const oldStand = current?.stand_number || null
      const newStand = updates.stand_number || null
      if (oldStand && oldStand !== newStand) {
        await supabase
          .from('stands')
          .update({ status: 'available', exhibitor_id: null })
          .eq('number', oldStand)
      }
      if (newStand) {
        await supabase
          .from('stands')
          .update({ status: 'sold', exhibitor_id: id })
          .eq('number', newStand)
      }

      // Enviar email de aprovação
      const { data: exhibitor } = await supabase.from('exhibitors').select('*').eq('id', id).single()
      if (exhibitor) {
        const { sendEmail } = await import('@/lib/email')
        sendEmail({
          to: exhibitor.email,
          subject: 'Cadastro Aprovado - Feira Multisetorial | Semana Empresarial 2026',
          html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5fa;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#5B2D8E,#3D1A6E);padding:30px;border-radius:16px 16px 0 0;text-align:center;">
      <h1 style="color:white;font-size:14px;letter-spacing:2px;margin:0 0 8px;">FEIRA MULTISETORIAL 2026</h1>
      <h2 style="color:white;font-size:20px;margin:0;">Cadastro Aprovado!</h2>
    </div>
    <div style="background:white;padding:30px;border-radius:0 0 16px 16px;border:1px solid #e0e0e0;border-top:none;">
      <p style="font-size:16px;color:#2D2D2D;">Olá, <strong>${exhibitor.responsible_name}</strong>!</p>
      <p style="color:#555;font-size:14px;">O cadastro da empresa <strong>${exhibitor.company_name}</strong> como expositora na Feira Multisetorial foi <strong style="color:#22c55e;">aprovado</strong>!</p>
      ${exhibitor.stand_number ? `<p style="color:#555;font-size:14px;">Seu estande: <strong>${exhibitor.stand_number}</strong></p>` : ''}
      ${exhibitor.admin_notes ? `<p style="color:#555;font-size:14px;">Observações: ${exhibitor.admin_notes}</p>` : ''}
      <p style="color:#555;font-size:14px;">Em breve entraremos em contato com mais detalhes sobre a montagem e regulamento.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="font-size:11px;color:#aaa;text-align:center;">Semana Empresarial de Açailândia 2026<br>acia.aca@gmail.com | +55 99 98833-4432</p>
    </div>
  </div>
</body></html>`,
        }).catch(() => {})
      }

      return NextResponse.json({ success: true, message: 'Expositor aprovado' })
    }

    if (action === 'reject') {
      const { data: current } = await supabase
        .from('exhibitors')
        .select('stand_number')
        .eq('id', id)
        .single()

      await supabase
        .from('exhibitors')
        .update({ status: 'rejected', admin_notes: updates.admin_notes || null })
        .eq('id', id)

      // Libera o stand que estava reservado
      if (current?.stand_number) {
        await supabase
          .from('stands')
          .update({ status: 'available', exhibitor_id: null })
          .eq('number', current.stand_number)
      }

      return NextResponse.json({ success: true, message: 'Expositor rejeitado' })
    }

    if (action === 'update') {
      const { data: current } = await supabase
        .from('exhibitors')
        .select('stand_number, status')
        .eq('id', id)
        .single()

      const { error: updateError } = await supabase
        .from('exhibitors')
        .update({
          company_name: updates.company_name,
          cnpj: updates.cnpj || null,
          responsible_name: updates.responsible_name,
          responsible_role: updates.responsible_role || null,
          email: updates.email,
          phone: updates.phone,
          segment: updates.segment,
          description: updates.description || null,
          stand_size: updates.stand_size,
          stand_number: updates.stand_number || null,
          admin_notes: updates.admin_notes || null,
          ...(updates.logo_url !== undefined ? { logo_url: updates.logo_url } : {}),
        })
        .eq('id', id)

      if (updateError) throw updateError

      // Sincroniza o catálogo de stands se o número mudou
      const oldStand = current?.stand_number || null
      const newStand = updates.stand_number || null
      const standStatus = current?.status === 'approved' ? 'sold' : 'reserved'
      if (oldStand !== newStand) {
        if (oldStand) {
          await supabase
            .from('stands')
            .update({ status: 'available', exhibitor_id: null })
            .eq('number', oldStand)
        }
        if (newStand) {
          await supabase
            .from('stands')
            .update({ status: standStatus, exhibitor_id: id })
            .eq('number', newStand)
        }
      }

      return NextResponse.json({ success: true, message: 'Expositor atualizado' })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    console.error('Erro ao atualizar expositor:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
