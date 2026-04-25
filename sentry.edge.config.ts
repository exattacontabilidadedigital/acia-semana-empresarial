// Configuração do Sentry para Edge Runtime (middleware, edge routes).

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
