// Configuração do Sentry para Node.js runtime (API routes, server components).
// DSN lido de SENTRY_DSN. Se vazio, Sentry fica inativo silenciosamente.

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === 'production',
  })
}
