'use client'

import { useState } from 'react'
import { Eye, Loader2 } from 'lucide-react'

// Botão "Visualizar prévia" que coleta o FormData do form pai e devolve um
// PDF de prévia. Abre uma aba nova SINCRONICAMENTE no clique (necessário pra
// não ser bloqueada pelo pop-up blocker), depois preenche com o PDF.
export default function TemplatePreviewButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    setError(null)

    const form = (e.currentTarget as HTMLButtonElement).closest('form')
    if (!form) {
      setError('Formulário não encontrado.')
      return
    }

    // 1) Abre a janela ANTES do fetch — preserva o user gesture
    const win = window.open('', '_blank')
    if (!win) {
      setError(
        'Não foi possível abrir nova aba. Permita pop-ups no navegador e tente de novo.'
      )
      return
    }

    // 2) Mostra um loader enquanto o PDF é gerado
    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Gerando prévia...</title>
          <style>
            body {
              margin: 0;
              display: grid;
              place-items: center;
              height: 100vh;
              font-family: system-ui, -apple-system, sans-serif;
              color: #555;
              background: #f5f5fa;
            }
            .spin {
              width: 40px;
              height: 40px;
              border: 4px solid #ddd;
              border-top-color: #5b2d8e;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin-bottom: 16px;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            .box {
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="box">
            <div class="spin"></div>
            <div>Gerando prévia do certificado...</div>
            <div style="font-size:12px;color:#888;margin-top:8px">
              Pode levar alguns segundos.
            </div>
          </div>
        </body>
      </html>
    `)
    win.document.close()

    setLoading(true)
    try {
      const formData = new FormData(form)
      const res = await fetch('/api/admin/certificates/preview', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        win.document.body.innerHTML = `
          <div style="padding:40px;font-family:system-ui;color:#b91c1c;max-width:560px;margin:0 auto">
            <h2>Falha ao gerar prévia</h2>
            <p style="color:#666">Status ${res.status}</p>
            <pre style="white-space:pre-wrap;font-size:12px;background:#f5f5fa;padding:12px;border-radius:8px">${escapeHtml(
              txt || '(sem detalhes)'
            )}</pre>
            <p style="font-size:13px;color:#888">
              Possíveis causas: você não está logado como admin; configuração
              SMTP incompleta no servidor; erro no Puppeteer.
            </p>
          </div>
        `
        setError('Falha ao gerar prévia (status ' + res.status + ').')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      // Substitui o conteúdo da aba pelo PDF
      win.location.replace(url)
      // Revoga depois (browser já carregou o PDF)
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err: any) {
      try {
        win.document.body.innerHTML = `
          <div style="padding:40px;font-family:system-ui;color:#b91c1c">
            <h2>Erro de conexão</h2>
            <pre>${escapeHtml(err?.message ?? 'desconhecido')}</pre>
          </div>
        `
      } catch {
        /* ignore */
      }
      setError(err?.message ?? 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="btn btn-ghost btn-lg"
        style={loading ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Gerando prévia...
          </>
        ) : (
          <>
            <Eye size={14} />
            Visualizar prévia
          </>
        )}
      </button>
      {error && (
        <span
          className="text-xs ml-3 inline-block"
          style={{ color: '#b91c1c' }}
        >
          {error}
        </span>
      )}
    </>
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
