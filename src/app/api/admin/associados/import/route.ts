import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseCsv } from '@/lib/csv'

const REQUIRED = ['razao_social', 'cnpj']
const ALLOWED = [
  'razao_social',
  'nome_fantasia',
  'cnpj',
  'segmento',
  'contact_name',
  'email',
  'phone',
  'cep',
  'rua',
  'numero',
  'bairro',
  'cidade',
  'estado',
  'notes',
]

function digits(s: string | undefined | null): string {
  return (s ?? '').replace(/\D/g, '')
}

type RowError = { line: number; razao_social?: string; cnpj?: string; reason: string }

export async function POST(request: Request) {
  // auth: precisa estar logado (RLS já protege, mas evita request anon desnecessário)
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  let text: string
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Selecione um arquivo CSV.' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo maior que 5MB.' }, { status: 400 })
    }
    text = await file.text()
  } catch {
    return NextResponse.json({ error: 'Falha ao ler o arquivo.' }, { status: 400 })
  }

  let parsed: ReturnType<typeof parseCsv>
  try {
    parsed = parseCsv(text)
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? 'CSV inválido.' },
      { status: 400 }
    )
  }

  // Confere headers obrigatórios
  for (const req of REQUIRED) {
    if (!parsed.headers.includes(req)) {
      return NextResponse.json(
        {
          error: `Coluna obrigatória ausente: "${req}". Use o modelo padrão.`,
        },
        { status: 400 }
      )
    }
  }

  const admin = createAdminClient()

  // Carrega CNPJs já existentes (1 query) pra detectar duplicados
  const { data: existing } = await admin.from('associates').select('cnpj')
  const existingCnpjs = new Set(
    (existing ?? []).map((r: any) => digits(r.cnpj))
  )

  let created = 0
  const skippedDuplicates: { line: number; cnpj: string; razao_social: string }[] = []
  const errors: RowError[] = []
  const inBatchCnpjs = new Set<string>() // evita duplicado dentro do mesmo arquivo

  // Insere uma a uma (volume baixo: ~centenas, no máximo)
  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i]
    const lineNum = i + 2 // +1 pelo header, +1 pra ser 1-based

    const razao_social = (row.razao_social ?? '').trim()
    const cnpjRaw = (row.cnpj ?? '').trim()
    const cnpjDigits = digits(cnpjRaw)

    // Skip linhas vazias
    if (!razao_social && !cnpjDigits) continue

    if (!razao_social) {
      errors.push({ line: lineNum, cnpj: cnpjRaw, reason: 'razao_social vazio' })
      continue
    }
    if (cnpjDigits.length !== 14) {
      errors.push({
        line: lineNum,
        razao_social,
        cnpj: cnpjRaw,
        reason: 'CNPJ deve ter 14 dígitos',
      })
      continue
    }

    if (existingCnpjs.has(cnpjDigits)) {
      skippedDuplicates.push({ line: lineNum, cnpj: cnpjRaw, razao_social })
      continue
    }
    if (inBatchCnpjs.has(cnpjDigits)) {
      skippedDuplicates.push({
        line: lineNum,
        cnpj: cnpjRaw,
        razao_social: razao_social + ' (repetido no arquivo)',
      })
      continue
    }
    inBatchCnpjs.add(cnpjDigits)

    // Monta payload só com campos permitidos
    const payload: Record<string, any> = { created_by: user.id }
    for (const col of ALLOWED) {
      const val = (row[col] ?? '').trim()
      if (col === 'cnpj') {
        payload.cnpj = cnpjDigits // armazena só dígitos
      } else if (col === 'email') {
        payload.email = val.toLowerCase() || null
      } else {
        payload[col] = val || null
      }
    }
    payload.status = 'active'

    const { error: insErr } = await admin.from('associates').insert(payload)
    if (insErr) {
      errors.push({
        line: lineNum,
        razao_social,
        cnpj: cnpjRaw,
        reason: insErr.message,
      })
      continue
    }
    created++
    existingCnpjs.add(cnpjDigits)
  }

  return NextResponse.json({
    ok: true,
    summary: {
      total_rows: parsed.rows.length,
      created,
      duplicates: skippedDuplicates.length,
      errors: errors.length,
    },
    duplicates: skippedDuplicates,
    errors,
  })
}
