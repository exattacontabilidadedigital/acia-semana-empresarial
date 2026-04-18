import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cpf = searchParams.get('cpf')?.replace(/\D/g, '')

  if (!cpf || cpf.length !== 11) {
    return NextResponse.json({ found: false })
  }

  const supabase = createAdminClient()

  // Busca primeiro nas inscrições atuais (2026)
  const { data } = await supabase
    .from('inscriptions')
    .select('nome, email, telefone, nome_empresa, cargo, cep, rua, numero, bairro, cidade, estado, complemento')
    .eq('cpf', cpf)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (data) {
    return NextResponse.json({
      found: true,
      data: {
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        nome_empresa: data.nome_empresa || '',
        cargo: data.cargo || '',
        cep: data.cep || '',
        rua: data.rua || '',
        numero: data.numero || '',
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        estado: data.estado || '',
        complemento: data.complemento || '',
      },
    })
  }

  // Se não encontrou, busca nas inscrições antigas (2025)
  const { data: oldData } = await supabase
    .from('old_inscriptions')
    .select('nome, email, telefone, nome_empresa, cargo, bairro, cidade')
    .eq('cpf', cpf)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (oldData) {
    return NextResponse.json({
      found: true,
      data: {
        nome: oldData.nome || '',
        email: oldData.email || '',
        telefone: oldData.telefone || '',
        nome_empresa: oldData.nome_empresa || '',
        cargo: oldData.cargo || '',
        cep: '',
        rua: '',
        numero: '',
        bairro: oldData.bairro || '',
        cidade: oldData.cidade || '',
        estado: '',
        complemento: '',
      },
    })
  }

  return NextResponse.json({ found: false })
}
