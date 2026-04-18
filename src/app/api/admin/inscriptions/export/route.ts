import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmado',
  free: 'Gratuito',
  pending: 'Pendente',
  failed: 'Falhou',
  refunded: 'Reembolsado',
}

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '')
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function formatPhone(phone: string): string {
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
    const { searchParams } = request.nextUrl
    const evento = searchParams.get('evento')
    const status = searchParams.get('status')
    const busca = searchParams.get('busca')

    const supabase = createAdminClient()

    let query = supabase
      .from('inscriptions')
      .select('*, events(title)')
      .order('created_at', { ascending: false })

    if (evento) {
      query = query.eq('event_id', Number(evento))
    }
    if (status) {
      query = query.eq('payment_status', status)
    }
    if (busca) {
      query = query.or(`nome.ilike.%${busca}%,cpf.ilike.%${busca}%`)
    }

    const { data: inscriptions, error } = await query

    if (error) {
      console.error('[CSV EXPORT] Erro:', error)
      return NextResponse.json({ error: 'Erro ao buscar inscrições' }, { status: 500 })
    }

    const headers = [
      'Nome',
      'Email',
      'CPF',
      'Telefone',
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
      escapeCSV(insc.events?.title ?? ''),
      escapeCSV(insc.quantity),
      escapeCSV(insc.is_half_price ? 'Meia-entrada' : 'Inteira'),
      escapeCSV(formatCurrencyBR(insc.total_amount)),
      escapeCSV(statusLabels[insc.payment_status] ?? insc.payment_status),
      escapeCSV(formatDateBR(insc.created_at)),
    ])

    // BOM for Excel compatibility + CSV content
    const BOM = '\uFEFF'
    const csvContent =
      BOM +
      headers.join(',') +
      '\n' +
      rows.map((row) => row.join(',')).join('\n')

    const now = new Date().toISOString().slice(0, 10)

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="inscricoes-${now}.csv"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[CSV EXPORT] Erro:', message, error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
