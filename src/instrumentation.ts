// Hook do Next.js que carrega a configuração do Sentry no runtime correto.
// O Next chama register() automaticamente em cold start de cada runtime.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

// Captura erros que escapam do React Server Components
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string> },
) {
  const Sentry = await import('@sentry/nextjs')
  Sentry.captureRequestError(err, request, { routerKind: 'App Router', routePath: request.path, routeType: 'route' })
}
