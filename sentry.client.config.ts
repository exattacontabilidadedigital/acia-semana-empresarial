// Configuração do Sentry para o navegador (browser).
// O DSN é lido de NEXT_PUBLIC_SENTRY_DSN. Se vazio, Sentry fica inativo silenciosamente.

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SITE_URL?.includes('localhost')
      ? 'development'
      : 'production',
    // Captura 10% das transações em prod (reduz volume e custo)
    tracesSampleRate: 0.1,
    // Replays só em erro (reduz volume)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    // Não envia eventos em dev
    enabled: !process.env.NEXT_PUBLIC_SITE_URL?.includes('localhost'),
  })
}
