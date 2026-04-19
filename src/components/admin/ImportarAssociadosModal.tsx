'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload,
  X,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react'
import ModalPortal from '@/components/ui/ModalPortal'

type RowError = { line: number; razao_social?: string; cnpj?: string; reason: string }
type Duplicate = { line: number; cnpj: string; razao_social: string }
type ImportResult = {
  ok: true
  summary: { total_rows: number; created: number; duplicates: number; errors: number }
  duplicates: Duplicate[]
  errors: RowError[]
}

export default function ImportarAssociadosModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) close()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, submitting])

  function close() {
    if (submitting) return
    setOpen(false)
    setTimeout(() => {
      setFile(null)
      setResult(null)
      setErrorMsg(null)
      if (inputRef.current) inputRef.current.value = ''
    }, 200)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setResult(null)
    setErrorMsg(null)
  }

  async function handleImport() {
    if (!file) return
    setSubmitting(true)
    setErrorMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/associados/import', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Falha ao importar.')
        return
      }
      setResult(data as ImportResult)
      // Refresh server data
      router.refresh()
    } catch {
      setErrorMsg('Erro de conexão.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-ghost btn-lg shrink-0"
      >
        <Upload size={16} /> Importar CSV
      </button>

      {open && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
            style={{ background: 'rgba(10,12,40,0.55)' }}
            onClick={close}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl rounded-[20px] bg-white my-4"
              style={{
                border: '1px solid var(--line)',
                boxShadow: '0 30px 60px -20px rgba(20,20,60,0.35)',
              }}
            >
              <div
                className="flex items-start justify-between gap-3 p-7 pb-4"
                style={{ borderBottom: '1px solid var(--line)' }}
              >
                <div className="min-w-0">
                  <div
                    className="mono text-[10px] tracking-[0.14em] mb-2"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    ASSOCIADOS · IMPORTAÇÃO EM LOTE
                  </div>
                  <h2 className="display" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>
                    Importar associados via CSV
                  </h2>
                  <p className="text-sm mt-2" style={{ color: 'var(--ink-70)', maxWidth: 460 }}>
                    Use o modelo abaixo. Cada linha vira 1 associado. CNPJs já
                    cadastrados são ignorados automaticamente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  disabled={submitting}
                  aria-label="Fechar"
                  className="rounded-lg p-2 transition-colors hover:bg-paper-2 disabled:opacity-50"
                  style={{ color: 'var(--ink-50)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-7 space-y-5">
                {!result && (
                  <>
                    {/* Modelo */}
                    <div
                      className="rounded-2xl p-4 flex items-center gap-3"
                      style={{
                        background: 'var(--azul-50)',
                        border: '1px solid var(--line)',
                      }}
                    >
                      <FileSpreadsheet
                        size={20}
                        style={{ color: 'var(--azul)' }}
                        className="shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-sm font-semibold"
                          style={{ color: 'var(--ink)' }}
                        >
                          Modelo de importação
                        </div>
                        <div className="text-xs" style={{ color: 'var(--ink-70)' }}>
                          14 colunas · 1 linha de exemplo · separador <code>;</code>
                        </div>
                      </div>
                      <a
                        href="/api/admin/associados/template"
                        download="modelo-associados.csv"
                        className="btn btn-orange shrink-0"
                      >
                        <Download size={14} /> Baixar
                      </a>
                    </div>

                    {/* Colunas */}
                    <details
                      className="rounded-xl"
                      style={{ border: '1px solid var(--line)' }}
                    >
                      <summary
                        className="cursor-pointer p-3 mono text-[10px] tracking-[0.14em]"
                        style={{ color: 'var(--ink-50)' }}
                      >
                        VER COLUNAS DETALHADAS
                      </summary>
                      <div
                        className="p-3 pt-0 text-xs space-y-1"
                        style={{ color: 'var(--ink-70)' }}
                      >
                        <p><strong>razao_social *</strong> — obrigatório</p>
                        <p><strong>cnpj *</strong> — obrigatório, 14 dígitos (com ou sem máscara)</p>
                        <p>nome_fantasia, segmento, contact_name, email, phone</p>
                        <p>cep, rua, numero, bairro, cidade, estado, notes</p>
                      </div>
                    </details>

                    {/* Upload */}
                    <div>
                      <label
                        className="mono block text-[10px] tracking-[0.1em] mb-2"
                        style={{ color: 'var(--ink-50)' }}
                      >
                        ARQUIVO CSV
                      </label>
                      <div className="flex gap-2">
                        <input
                          ref={inputRef}
                          type="file"
                          accept=".csv,text/csv"
                          onChange={handleFileChange}
                          disabled={submitting}
                          className="admin-input flex-1 px-3 py-2 rounded-xl text-xs"
                        />
                      </div>
                      {file && (
                        <p
                          className="mt-2 mono text-[11px] tracking-[0.06em]"
                          style={{ color: 'var(--ink-50)' }}
                        >
                          {file.name} · {(file.size / 1024).toFixed(1)} KB
                        </p>
                      )}
                    </div>

                    {errorMsg && (
                      <div
                        className="rounded-lg p-3 text-sm flex items-start gap-2"
                        style={{
                          background: '#fff1f2',
                          color: '#b91c1c',
                          border: '1px solid #fecdd3',
                        }}
                      >
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}
                  </>
                )}

                {result && <ResultPanel result={result} />}
              </div>

              <div
                className="flex flex-wrap gap-3 p-7 pt-4"
                style={{ borderTop: '1px solid var(--line)' }}
              >
                {!result ? (
                  <>
                    <button
                      type="button"
                      onClick={handleImport}
                      disabled={!file || submitting}
                      className="btn btn-orange btn-lg"
                      style={
                        !file || submitting
                          ? { opacity: 0.5, pointerEvents: 'none' }
                          : undefined
                      }
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Importando...
                        </>
                      ) : (
                        <>
                          <Upload size={14} /> Importar
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={close}
                      disabled={submitting}
                      className="btn btn-ghost btn-lg"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setResult(null)
                        setFile(null)
                        if (inputRef.current) inputRef.current.value = ''
                      }}
                      className="btn btn-ghost btn-lg"
                    >
                      Importar outro arquivo
                    </button>
                    <button
                      type="button"
                      onClick={close}
                      className="btn btn-orange btn-lg"
                    >
                      Concluir
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  )
}

function ResultPanel({ result }: { result: ImportResult }) {
  const { summary, duplicates, errors } = result
  return (
    <div className="space-y-5">
      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          label="CRIADOS"
          value={summary.created}
          icon={<CheckCircle2 size={14} />}
          accent="var(--verde-600)"
          accentBg="rgba(166,206,58,0.18)"
        />
        <SummaryCard
          label="DUPLICADOS"
          value={summary.duplicates}
          icon={<AlertTriangle size={14} />}
          accent="var(--laranja)"
          accentBg="rgba(248,130,30,0.15)"
        />
        <SummaryCard
          label="ERROS"
          value={summary.errors}
          icon={<AlertCircle size={14} />}
          accent="#991b1b"
          accentBg="#fee2e2"
        />
      </div>

      <div
        className="text-xs text-center mono tracking-[0.06em]"
        style={{ color: 'var(--ink-50)' }}
      >
        {summary.total_rows} LINHA(S) PROCESSADA(S)
      </div>

      {duplicates.length > 0 && (
        <div className="rounded-xl" style={{ border: '1px solid var(--line)' }}>
          <div
            className="px-4 py-2 mono text-[10px] tracking-[0.14em]"
            style={{
              color: '#b85d00',
              background: 'rgba(248,130,30,0.06)',
              borderBottom: '1px solid var(--line)',
            }}
          >
            DUPLICADOS IGNORADOS
          </div>
          <div className="max-h-40 overflow-y-auto">
            {duplicates.map((d, i) => (
              <div
                key={i}
                className="px-4 py-2 text-xs flex items-center gap-3"
                style={{
                  borderBottom:
                    i < duplicates.length - 1 ? '1px solid var(--line)' : undefined,
                }}
              >
                <span
                  className="mono text-[10px] tracking-[0.06em] shrink-0"
                  style={{ color: 'var(--ink-50)' }}
                >
                  L{d.line}
                </span>
                <span className="truncate" style={{ color: 'var(--ink)' }}>
                  {d.razao_social}
                </span>
                <span
                  className="mono text-[10px] tracking-[0.06em] ml-auto shrink-0"
                  style={{ color: 'var(--ink-50)' }}
                >
                  {d.cnpj}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="rounded-xl" style={{ border: '1px solid var(--line)' }}>
          <div
            className="px-4 py-2 mono text-[10px] tracking-[0.14em]"
            style={{
              color: '#b91c1c',
              background: '#fff1f2',
              borderBottom: '1px solid var(--line)',
            }}
          >
            ERROS
          </div>
          <div className="max-h-40 overflow-y-auto">
            {errors.map((e, i) => (
              <div
                key={i}
                className="px-4 py-2 text-xs"
                style={{
                  borderBottom: i < errors.length - 1 ? '1px solid var(--line)' : undefined,
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="mono text-[10px] tracking-[0.06em] shrink-0"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    L{e.line}
                  </span>
                  <span
                    className="truncate flex-1"
                    style={{ color: 'var(--ink)' }}
                  >
                    {e.razao_social ?? '(sem nome)'}
                  </span>
                </div>
                <div
                  className="mt-0.5 text-[11px]"
                  style={{ color: '#b91c1c' }}
                >
                  {e.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon,
  accent,
  accentBg,
}: {
  label: string
  value: number
  icon: React.ReactNode
  accent: string
  accentBg: string
}) {
  return (
    <div
      className="rounded-xl p-3 flex items-center gap-3"
      style={{ border: '1px solid var(--line)' }}
    >
      <div
        className="rounded-lg p-2 shrink-0"
        style={{ background: accentBg, color: accent }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div
          className="mono text-[10px] tracking-[0.14em]"
          style={{ color: 'var(--ink-50)' }}
        >
          {label}
        </div>
        <div
          className="display"
          style={{ fontSize: 22, color: accent, lineHeight: 1 }}
        >
          {value}
        </div>
      </div>
    </div>
  )
}
