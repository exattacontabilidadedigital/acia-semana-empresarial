'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, X, Loader2, Sparkles, RotateCcw } from 'lucide-react'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

const STORAGE_KEY = 'aci_chat_history_v1'
const WELCOME: ChatMessage = {
  role: 'assistant',
  content:
    'Olá! 👋 Sou a Aci, assistente virtual da Semana Empresarial 2026. Posso te ajudar a ver eventos, consultar suas inscrições, gerar links de pagamento e mais. Como posso ajudar?',
}

// Renderiza um trecho inline aplicando **bold** e linkificando URLs.
function renderInline(text: string, keyBase: string) {
  // Tokeniza em [bold] | [url] | [text]
  const tokens: Array<{ type: 'bold' | 'url' | 'text'; value: string }> = []
  const regex = /(\*\*([^*]+?)\*\*)|(\bhttps?:\/\/[^\s)]+)/g
  let lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, m.index) })
    }
    if (m[1]) {
      tokens.push({ type: 'bold', value: m[2] })
    } else if (m[3]) {
      tokens.push({ type: 'url', value: m[3] })
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) })
  }
  return tokens.map((t, i) => {
    const key = `${keyBase}-${i}`
    if (t.type === 'bold') {
      return (
        <strong key={key} style={{ fontWeight: 600, color: 'inherit' }}>
          {t.value}
        </strong>
      )
    }
    if (t.type === 'url') {
      return (
        <a
          key={key}
          href={t.value}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--azul)',
            textDecoration: 'underline',
            wordBreak: 'break-all',
          }}
        >
          {t.value}
        </a>
      )
    }
    return <span key={key}>{t.value}</span>
  })
}

function renderMessageContent(text: string) {
  // Renderiza por linhas — linhas iniciadas em "- " ou "* " viram bullets.
  const lines = text.split(/\r?\n/)
  const blocks: React.ReactNode[] = []
  let bulletBuffer: string[] = []

  const flushBullets = () => {
    if (bulletBuffer.length === 0) return
    const items = bulletBuffer
    blocks.push(
      <ul
        key={`ul-${blocks.length}`}
        style={{ margin: '4px 0', paddingLeft: 18, listStyle: 'disc' }}
      >
        {items.map((item, i) => (
          <li key={i} style={{ margin: '2px 0' }}>
            {renderInline(item, `b${blocks.length}-${i}`)}
          </li>
        ))}
      </ul>,
    )
    bulletBuffer = []
  }

  lines.forEach((line, i) => {
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/)
    if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1])
      return
    }
    flushBullets()
    if (line.trim() === '') {
      blocks.push(<div key={`sp-${i}`} style={{ height: 6 }} />)
      return
    }
    blocks.push(
      <div key={`p-${i}`} style={{ margin: '2px 0' }}>
        {renderInline(line, `p${i}`)}
      </div>,
    )
  })
  flushBullets()

  return <>{blocks}</>
}

export default function FloatingChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Carrega histórico do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[]
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed)
      }
    } catch {
      /* noop */
    }
  }, [])

  // Persiste histórico
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)))
    } catch {
      /* noop */
    }
  }, [messages])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  // Foco no input ao abrir
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 200)
      return () => clearTimeout(t)
    }
  }, [open])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao consultar a IA.')
      }
      setMessages([
        ...next,
        { role: 'assistant', content: data.reply || '...' },
      ])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro de conexão.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function reset() {
    setMessages([WELCOME])
    setError(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* noop */
    }
  }

  const SUGGESTIONS = [
    'Ver eventos disponíveis',
    'Consultar minhas inscrições',
    'Quero gerar um novo link de pagamento',
  ]

  return (
    <>
      {/* Botão flutuante */}
      {!open && (
        <button
          aria-label="Abrir chat com a Aci"
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            left: 20,
            bottom: 20,
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'var(--laranja)',
            display: 'grid',
            placeItems: 'center',
            boxShadow:
              '0 8px 24px rgba(248,130,30,0.45), 0 2px 6px rgba(0,0,0,0.15)',
            zIndex: 900,
            color: 'white',
            transition: 'transform 0.18s ease, box-shadow 0.18s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          <MessageCircle size={28} />
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: 'var(--verde)',
              border: '2px solid white',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Sparkles size={9} color="white" />
          </span>
        </button>
      )}

      {/* Painel */}
      {open && (
        <div
          role="dialog"
          aria-label="Chat com a Aci"
          style={{
            position: 'fixed',
            left: 20,
            bottom: 20,
            width: 'min(380px, calc(100vw - 40px))',
            height: 'min(580px, calc(100vh - 40px))',
            background: 'white',
            borderRadius: 18,
            boxShadow:
              '0 24px 60px -12px rgba(10,12,40,0.35), 0 0 0 1px var(--line)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 950,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'var(--azul-900)',
              color: 'white',
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--laranja)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 800,
                letterSpacing: '-0.04em',
              }}
            >
              Aci
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="display"
                style={{ fontSize: 15, letterSpacing: '-0.02em' }}
              >
                Aci · Assistente
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--verde)',
                  }}
                />
                Online · Semana Empresarial 2026
              </div>
            </div>
            <button
              onClick={reset}
              title="Limpar conversa"
              aria-label="Limpar conversa"
              style={{
                color: 'rgba(255,255,255,0.6)',
                padding: 6,
                borderRadius: 8,
              }}
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fechar chat"
              style={{ color: 'white', padding: 6, borderRadius: 8 }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Mensagens */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 16,
              background: 'var(--paper)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent:
                    m.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: 14,
                    background:
                      m.role === 'user' ? 'var(--azul)' : 'white',
                    color:
                      m.role === 'user' ? 'white' : 'var(--ink)',
                    border:
                      m.role === 'user'
                        ? 'none'
                        : '1px solid var(--line)',
                    fontSize: 14,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {renderMessageContent(m.content)}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 14,
                    background: 'white',
                    border: '1px solid var(--line)',
                    fontSize: 13,
                    color: 'var(--ink-50)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Loader2 size={14} className="animate-spin" />
                  Pensando...
                </div>
              </div>
            )}

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontSize: 12,
                }}
              >
                {error}
              </div>
            )}

            {/* Sugestões */}
            {messages.length <= 1 && !loading && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginTop: 8,
                }}
              >
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setInput(s)
                      setTimeout(() => send(), 0)
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 999,
                      background: 'white',
                      border: '1px solid var(--line)',
                      fontSize: 12,
                      color: 'var(--ink-70)',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div
            style={{
              padding: 12,
              background: 'white',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-end',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Digite sua mensagem..."
              rows={1}
              disabled={loading}
              style={{
                flex: 1,
                resize: 'none',
                border: '1px solid var(--line)',
                borderRadius: 12,
                padding: '10px 12px',
                fontSize: 14,
                fontFamily: 'inherit',
                outline: 'none',
                background: 'var(--paper)',
                color: 'var(--ink)',
                maxHeight: 100,
                minHeight: 38,
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              aria-label="Enviar"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background:
                  loading || !input.trim()
                    ? 'var(--paper-2)'
                    : 'var(--laranja)',
                color: 'white',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                cursor:
                  loading || !input.trim() ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s ease',
              }}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>

          <div
            style={{
              padding: '6px 12px 10px',
              background: 'white',
              fontSize: 10,
              color: 'var(--ink-50)',
              textAlign: 'center',
              borderTop: '1px solid var(--paper-2)',
            }}
          >
            Powered by z.ai · Respostas geradas por IA podem conter imprecisões.
          </div>
        </div>
      )}
    </>
  )
}
