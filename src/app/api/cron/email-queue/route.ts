import { NextResponse } from 'next/server'
import { processEmailQueue } from '@/lib/email'
import { reportError } from '@/lib/observability'

/**
 * Endpoint cron que processa a fila de e-mails. Deve ser invocado periodicamente
 * (ex.: a cada 2-5 min) por um cron externo (Hostinger cron, GitHub Actions, etc.).
 *
 * Proteção: precisa do header `x-cron-secret` casando com `CRON_SECRET` (env).
 *
 * Uso:
 *   curl -H "x-cron-secret: $CRON_SECRET" https://seusite.com/api/cron/email-queue
 */
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return handle(request)
}

export async function GET(request: Request) {
  return handle(request)
}

async function handle(request: Request) {
  const expected = process.env.CRON_SECRET
  if (expected) {
    const provided = request.headers.get('x-cron-secret')
    if (provided !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await processEmailQueue()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    reportError(error, { scope: 'cron.email-queue' })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro' },
      { status: 500 },
    )
  }
}
