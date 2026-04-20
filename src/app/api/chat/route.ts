import { NextRequest, NextResponse } from 'next/server'
import { callZai, type ZaiMessage } from '@/lib/zai'
import { TOOLS, executeTool } from '@/lib/chat/tools'
import { buildSystemPrompt } from '@/lib/chat/system-prompt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_TOOL_HOPS = 4

interface IncomingMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { messages?: IncomingMessage[] }
    const incoming = Array.isArray(body.messages) ? body.messages : []

    if (incoming.length === 0) {
      return NextResponse.json({ error: 'Nenhuma mensagem.' }, { status: 400 })
    }

    const sanitized: ZaiMessage[] = incoming
      .filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0,
      )
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }))

    const messages: ZaiMessage[] = [
      { role: 'system', content: buildSystemPrompt() },
      ...sanitized,
    ]

    let finalText = ''
    let hops = 0

    while (hops < MAX_TOOL_HOPS) {
      hops++
      const completion = await callZai({
        messages,
        tools: TOOLS,
        toolChoice: 'auto',
        temperature: 0.4,
        maxTokens: 2500,
      })

      const choice = completion.choices?.[0]
      if (!choice) {
        return NextResponse.json(
          { error: 'Resposta vazia da z.ai.' },
          { status: 502 },
        )
      }

      const msg = choice.message
      const toolCalls = msg.tool_calls ?? []

      if (toolCalls.length === 0) {
        finalText = msg.content || ''
        break
      }

      messages.push({
        role: 'assistant',
        content: msg.content ?? '',
        tool_calls: toolCalls,
      })

      for (const call of toolCalls) {
        let parsedArgs: Record<string, unknown> = {}
        try {
          parsedArgs = call.function.arguments
            ? JSON.parse(call.function.arguments)
            : {}
        } catch {
          parsedArgs = {}
        }

        const result = await executeTool(call.function.name, parsedArgs)

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name: call.function.name,
          content: JSON.stringify(result),
        })
      }
    }

    if (!finalText) {
      finalText =
        'Desculpe, não consegui finalizar sua solicitação. Pode tentar reformular?'
    }

    return NextResponse.json({ reply: finalText })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('[/api/chat] erro:', message, err)
    return NextResponse.json(
      { error: `Erro: ${message}` },
      { status: 500 },
    )
  }
}
