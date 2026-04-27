import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePartnerApi } from '@/lib/auth'

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmado',
  free: 'Gratuito',
  pending: 'Pendente',
  failed: 'Falhou',
  refunded: 'Reembolsado',
  cancelled: 'Cancelado',
}

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatCPF(cpf: string | null): string {
  if (!cpf) return ''
  const digits = cpf.replace(/\D/g, '')
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function formatPhone(phone: string | null): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

function formatDateBR(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

function formatCurrencyBR(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePartnerApi('export_data')
    if ('error' in auth) return auth.error

    const { searchParams } = request.nextUrl
    const evento = searchParams.get('evento')
    const busca = searchParams.get('busca')

    const supabase = createAdminClient()

    // Eventos da org (segunda linha de defesa: filtra inscriptions só por
    // event_ids da org ativa, mesmo com service-role)
    const { data: events } = await supabase
      .from('events')
      .select('id, title')
      .eq('organization_id', auth.org.id)
    const eventIds = (events ?? []).map((e: any) => e.id)

    if (eventIds.length === 0) {
      return new Response('﻿' + 'Nenhum evento encontrado para esta organização.', {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="inscricoes.csv"`,
        },
      })
    }

    let query = supabase
      .from('inscriptions')
      .select('*, events(title)')
      .in('event_id', eventIds)
      .order('created_at', { ascending: false })

    if (evento) {
      const id = Number(evento)
      if (!isNaN(id) && eventIds.includes(id)) {
        query = query.eq('event_id', id)
      }
    }
    if (busca) {
      query = query.or(`nome.ilike.%${busca}%,cpf.ilike.%${busca}%,email.ilike.%${busca}%`)
    }

    const { data: inscriptions, error } = await query

    if (error) {
      console.error('[PARTNER CSV EXPORT] Erro:', error)
      return NextResponse.json({ error: 'Erro ao buscar inscrições' }, { status: 500 })
    }

    const headers = [
      'Nome',
      'Email',
      'CPF',
      'Telefone',
      'Empresa',
      'Cargo',
      'Evento',
      'Quantidade',
      'Tipo',
      'Valor',
      'Status Pagamento',
      'Data Inscrição',
    ]

    const rows = (inscriptions ?? []).map((insc: any) => [
      escapeCSV(insc.nome),
      escapeCSV(insc.email),
      escapeCSV(formatCPF(insc.cpf)),
      escapeCSV(formatPhone(insc.telefone)),
      escapeCSV(insc.nome_empresa ?? ''),
      escapeCSV(insc.cargo ?? ''),
      escapeCSV(insc.events?.title ?? ''),
      escapeCSV(insc.quantity),
      escapeCSV(insc.is_half_price ? 'Meia-entrada' : 'Inteira'),
      escapeCSV(formatCurrencyBR(insc.total_amount ?? 0)),
      escapeCSV(statusLabels[insc.payment_status] ?? insc.payment_status),
      escapeCSV(formatDateBR(insc.created_at)),
    ])

    const BOM = '﻿'
    const csvContent =
      BOM +
      headers.join(',') +
      '\n' +
      rows.map((row) => row.join(',')).join('\n')

    const now = new Date().toISOString().slice(0, 10)
    const slug = auth.org.slug || 'org'

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="inscricoes-${slug}-${now}.csv"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[PARTNER CSV EXPORT] Erro:', message, error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
