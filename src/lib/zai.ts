/**
 * Cliente mínimo para a API z.ai (compatível OpenAI: /chat/completions).
 * Docs: https://docs.z.ai/guides/overview/quick-start
 */

export type ZaiRole = 'system' | 'user' | 'assistant' | 'tool'

export interface ZaiToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ZaiMessage {
  role: ZaiRole
  content: string | null
  tool_calls?: ZaiToolCall[]
  tool_call_id?: string
  name?: string
}

export interface ZaiToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface ZaiCompletionResponse {
  id: string
  choices: Array<{
    index: number
    finish_reason: string
    message: {
      role: 'assistant'
      content: string | null
      tool_calls?: ZaiToolCall[]
    }
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

const BASE_URL = process.env.ZAI_BASE_URL || 'https://api.z.ai/api/paas/v4'
const MODEL = process.env.ZAI_MODEL || 'glm-4.5-flash'

export async function callZai(opts: {
  messages: ZaiMessage[]
  tools?: ZaiToolDefinition[]
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}): Promise<ZaiCompletionResponse> {
  const apiKey = process.env.ZAI_API_KEY
  if (!apiKey) {
    throw new Error('ZAI_API_KEY não configurada nas variáveis de ambiente.')
  }

  const body: Record<string, unknown> = {
    model: MODEL,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.4,
  }
  if (opts.maxTokens) body.max_tokens = opts.maxTokens
  if (opts.tools && opts.tools.length > 0) {
    body.tools = opts.tools
    body.tool_choice = opts.toolChoice ?? 'auto'
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`z.ai HTTP ${res.status}: ${text.slice(0, 500)}`)
  }

  return (await res.json()) as ZaiCompletionResponse
}
