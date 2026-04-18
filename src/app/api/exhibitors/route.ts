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
  logo_url: z.string().nullable().optional(),
})

// POST - Cadastro público de expositor
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = registerSchema.parse(body)

    const supabase = createAdminClient()

    // Verificar se já existe cadastro com mesmo email
    const { data: existing } = await supabase
      .from('exhibitors')
      .select('id, status')
      .eq('email', data.email)
      .in('status', ['pending', 'approved'])
      .single()

    if (existing) {
      return NextResponse.json(
        { error: existing.status === 'approved'
          ? 'Este email já possui um cadastro aprovado'
          : 'Já existe uma solicitação pendente para este email'
        },
        { status: 400 }
      )
    }

    const { error: insertError } = await supabase
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
        logo_url: data.logo_url || null,
        status: 'pending',
      })

    if (insertError) {
      console.error('Erro ao cadastrar expositor:', insertError)
      return NextResponse.json({ error: 'Erro ao realizar cadastro' }, { status: 500 })
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
      await supabase
        .from('exhibitors')
        .update({ status: 'approved', admin_notes: updates.admin_notes || null, stand_number: updates.stand_number || null })
        .eq('id', id)

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
      await supabase
        .from('exhibitors')
        .update({ status: 'rejected', admin_notes: updates.admin_notes || null })
        .eq('id', id)

      return NextResponse.json({ success: true, message: 'Expositor rejeitado' })
    }

    if (action === 'update') {
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
      return NextResponse.json({ success: true, message: 'Expositor atualizado' })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    console.error('Erro ao atualizar expositor:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
