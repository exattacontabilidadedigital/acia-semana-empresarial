import { NextResponse } from 'next/server'
import { isValidCNPJ } from '@/lib/utils'
import { enforceRateLimit } from '@/lib/rate-limit'

// BrasilAPI: https://brasilapi.com.br/api/cnpj/v1/{cnpj}
// Pública, sem auth, sem rate limit estrito.
const BRASIL_API_URL = 'https://brasilapi.com.br/api/cnpj/v1/'

export async function GET(
  request: Request,
  { params }: { params: { cnpj: string } }
) {
  const limited = enforceRateLimit(request, { key: 'cnpj-lookup', limit: 20, windowSeconds: 60 })
  if (limited) return limited

  const digits = (params.cnpj ?? '').replace(/\D/g, '')

  if (digits.length !== 14) {
    return NextResponse.json(
      { error: 'CNPJ inválido — precisa ter 14 dígitos.' },
      { status: 400 }
    )
  }

  // Valida dígitos verificadores localmente antes de gastar chamada na BrasilAPI
  if (!isValidCNPJ(digits)) {
    return NextResponse.json(
      { error: 'CNPJ inválido — verifique os números digitados.' },
      { status: 400 }
    )
  }

  try {
    const res = await fetch(`${BRASIL_API_URL}${digits}`, {
      headers: {
        Accept: 'application/json',
        // BrasilAPI bloqueia user-agents genéricos; identificar como navegador
        'User-Agent':
          'Mozilla/5.0 (compatible; SemanaEmpresarial/1.0; +https://acia-ma.com.br)',
      },
      // Cache 1h no edge — empresas mudam pouco
      next: { revalidate: 3600 },
    })

    if (res.status === 404) {
      return NextResponse.json(
        { error: 'CNPJ não encontrado na Receita Federal.' },
        { status: 404 }
      )
    }

    if (res.status === 400) {
      // Repassa a mensagem da BrasilAPI ("CNPJ X.X.X/X-X inválido.")
      const body = await res.json().catch(() => null)
      return NextResponse.json(
        {
          error:
            body?.message ||
            'CNPJ inválido — verifique os números digitados.',
        },
        { status: 400 }
      )
    }

    if (res.status === 429) {
      return NextResponse.json(
        { error: 'Muitas consultas em sequência. Aguarde alguns segundos.' },
        { status: 429 }
      )
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Falha ao consultar CNPJ (HTTP ${res.status}).` },
        { status: 502 }
      )
    }

    const raw = await res.json()

    // Normaliza pro formato dos campos do nosso form
    return NextResponse.json({
      cnpj: digits,
      razao_social: raw.razao_social ?? '',
      nome_fantasia: raw.nome_fantasia ?? '',
      segmento: raw.cnae_fiscal_descricao ?? '',
      email: (raw.email ?? '').toLowerCase(),
      phone: raw.ddd_telefone_1
        ? formatPhoneFromBrasilAPI(raw.ddd_telefone_1)
        : '',
      cep: raw.cep ?? '',
      rua:
        [raw.descricao_tipo_de_logradouro, raw.logradouro]
          .filter(Boolean)
          .join(' ')
          .trim() || '',
      numero: raw.numero ?? '',
      bairro: raw.bairro ?? '',
      cidade: raw.municipio ?? '',
      estado: raw.uf ?? '',
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Erro de rede ao consultar BrasilAPI.' },
      { status: 502 }
    )
  }
}

// BrasilAPI retorna telefone como "9999999999" (com DDD junto, sem máscara)
function formatPhoneFromBrasilAPI(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  }
  return raw
}
