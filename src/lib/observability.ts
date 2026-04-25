// Helper fino sobre @sentry/nextjs para capturar erros em handlers assíncronos.
// Usar em pontos onde o erro hoje é engolido por `.catch(() => {})` ou try/catch silencioso.

import * as Sentry from '@sentry/nextjs'

interface ReportOptions {
  /** Identificador do contexto: "webhook.asaas", "email.confirmation", "payments.credit-card", etc. */
  scope: string
  /** Dados extras úteis para debug. Não incluir dados sensíveis (CPF completo, número de cartão). */
  extra?: Record<string, unknown>
  /** Tags para filtrar no Sentry (ex.: { event_type: 'PAYMENT_CONFIRMED' }) */
  tags?: Record<string, string>
}

/**
 * Captura um erro no Sentry e também loga no console. Se Sentry não estiver
 * configurado (DSN ausente), apenas loga.
 */
export function reportError(error: unknown, options: ReportOptions): void {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[${options.scope}]`, message, options.extra ?? '')

  Sentry.withScope((scope) => {
    scope.setTag('scope', options.scope)
    if (options.tags) {
      for (const [k, v] of Object.entries(options.tags)) scope.setTag(k, v)
    }
    if (options.extra) {
      for (const [k, v] of Object.entries(options.extra)) scope.setExtra(k, v)
    }
    Sentry.captureException(error)
  })
}

/**
 * Captura uma mensagem (não-erro) no Sentry. Útil para warnings/condições inesperadas
 * que não geraram exceção mas são interessantes monitorar.
 */
export function reportWarning(message: string, options: ReportOptions): void {
  console.warn(`[${options.scope}]`, message, options.extra ?? '')

  Sentry.withScope((scope) => {
    scope.setTag('scope', options.scope)
    scope.setLevel('warning')
    if (options.tags) {
      for (const [k, v] of Object.entries(options.tags)) scope.setTag(k, v)
    }
    if (options.extra) {
      for (const [k, v] of Object.entries(options.extra)) scope.setExtra(k, v)
    }
    Sentry.captureMessage(message)
  })
}
