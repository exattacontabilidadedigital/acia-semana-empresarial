import { NextRequest, NextResponse } from 'next/server'

/**
 * Rate limiter in-memory simples (token bucket por IP+key).
 *
 * Limitações:
 * - Estado em memória do processo. Com múltiplas instâncias, cada uma tem seu próprio
 *   bucket (limite efetivo é N * limit). Para deploy multi-instância, migrar para
 *   Redis/Upstash.
 * - Estado é perdido em restart. Não é persistido.
 *
 * Suficiente para 1 instância (deploy atual via Hostinger/Docker single replica).
 * Protege contra scraping/enumeração casual e abuso leve.
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Limpa buckets expirados a cada 5min para evitar vazamento de memória
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of Array.from(buckets.entries())) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}, 5 * 60_000).unref?.()

export interface RateLimitOptions {
  /** Chave lógica (ex.: 'lookup', 'cnpj') — concatenada com IP. */
  key: string
  /** Máximo de requests permitidos na janela. */
  limit: number
  /** Janela em segundos. */
  windowSeconds: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfterSeconds: number
}

function getClientIp(req: NextRequest | Request): string {
  const headers = 'headers' in req ? req.headers : (req as NextRequest).headers
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || 'unknown'
  const real = headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}

export function checkRateLimit(
  req: NextRequest | Request,
  options: RateLimitOptions,
): RateLimitResult {
  const ip = getClientIp(req)
  const bucketKey = `${options.key}:${ip}`
  const now = Date.now()
  const windowMs = options.windowSeconds * 1000

  const existing = buckets.get(bucketKey)

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs
    buckets.set(bucketKey, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: options.limit - 1,
      resetAt,
      retryAfterSeconds: 0,
    }
  }

  if (existing.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    }
  }

  existing.count += 1
  return {
    allowed: true,
    remaining: options.limit - existing.count,
    resetAt: existing.resetAt,
    retryAfterSeconds: 0,
  }
}

/**
 * Helper: aplica rate limit e retorna a Response 429 se excedido. Caso contrário
 * retorna `null` e o handler segue normalmente.
 *
 * Uso:
 * ```ts
 * const limited = enforceRateLimit(req, { key: 'lookup', limit: 30, windowSeconds: 60 })
 * if (limited) return limited
 * ```
 */
export function enforceRateLimit(
  req: NextRequest | Request,
  options: RateLimitOptions,
): NextResponse | null {
  const result = checkRateLimit(req, options)
  if (result.allowed) return null
  return NextResponse.json(
    {
      error: 'Muitas requisições. Tente novamente em alguns instantes.',
      retry_after_seconds: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
        'X-RateLimit-Limit': String(options.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
      },
    },
  )
}
