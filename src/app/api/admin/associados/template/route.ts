import { toCsv } from '@/lib/csv'

const HEADERS = [
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

const EXAMPLE_ROW = {
  razao_social: 'Empresa Exemplo LTDA',
  nome_fantasia: 'Empresa Exemplo',
  cnpj: '00.000.000/0001-00',
  segmento: 'Comércio varejista',
  contact_name: 'Maria Silva',
  email: 'contato@exemplo.com.br',
  phone: '(99) 99999-9999',
  cep: '65900-000',
  rua: 'Av. Brasil',
  numero: '123',
  bairro: 'Centro',
  cidade: 'Açailândia',
  estado: 'MA',
  notes: 'Apague esta linha de exemplo antes de importar',
}

export async function GET() {
  const csv = toCsv(HEADERS, [EXAMPLE_ROW], ';')
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition':
        'attachment; filename="modelo-associados.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
