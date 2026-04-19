'use client'

import { useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Plus, X, Loader2, CheckCircle2, AlertCircle, Search } from 'lucide-react'
import ModalPortal from '@/components/ui/ModalPortal'
import { createAssociateAction } from '@/app/admin/associados/actions'

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; message?: string }
  | { status: 'notfound' }
  | { status: 'error'; message: string }

type FormState = {
  razao_social: string
  nome_fantasia: string
  cnpj: string
  segmento: string
  contact_name: string
  email: string
  phone: string
  cep: string
  rua: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  notes: string
}

const EMPTY_FORM: FormState = {
  razao_social: '',
  nome_fantasia: '',
  cnpj: '',
  segmento: '',
  contact_name: '',
  email: '',
  phone: '',
  cep: '',
  rua: '',
  numero: '',
  bairro: '',
  cidade: '',
  estado: '',
  notes: '',
}

function maskCnpj(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export default function NovoAssociadoModal() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [lookup, setLookup] = useState<LookupState>({ status: 'idle' })

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  function close() {
    setOpen(false)
    setTimeout(() => {
      setForm(EMPTY_FORM)
      setLookup({ status: 'idle' })
    }, 200)
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function lookupCnpj(maskedCnpj: string) {
    const digits = maskedCnpj.replace(/\D/g, '')
    if (digits.length !== 14) return
    setLookup({ status: 'loading' })
    try {
      const res = await fetch(`/api/cnpj/${digits}`)
      const data = await res.json()
      if (res.status === 404) {
        setLookup({ status: 'notfound' })
        return
      }
      if (!res.ok) {
        setLookup({ status: 'error', message: data.error ?? 'Erro ao consultar.' })
        return
      }
      // Auto-preenche apenas campos vazios (não sobrescreve o que o usuário digitou)
      setForm((prev) => ({
        ...prev,
        razao_social: prev.razao_social || data.razao_social || '',
        nome_fantasia: prev.nome_fantasia || data.nome_fantasia || '',
        segmento: prev.segmento || data.segmento || '',
        email: prev.email || data.email || '',
        phone: prev.phone || data.phone || '',
        cep: prev.cep || data.cep || '',
        rua: prev.rua || data.rua || '',
        numero: prev.numero || data.numero || '',
        bairro: prev.bairro || data.bairro || '',
        cidade: prev.cidade || data.cidade || '',
        estado: prev.estado || data.estado || '',
      }))
      setLookup({
        status: 'ok',
        message: 'Dados preenchidos automaticamente. Confira e ajuste se precisar.',
      })
    } catch {
      setLookup({ status: 'error', message: 'Falha de rede ao consultar CNPJ.' })
    }
  }

  function handleCnpjChange(value: string) {
    const masked = maskCnpj(value)
    setField('cnpj', masked)
    // Reset lookup state ao editar
    if (lookup.status !== 'idle') setLookup({ status: 'idle' })
    // Auto-busca quando completa 14 dígitos
    if (masked.replace(/\D/g, '').length === 14) {
      lookupCnpj(masked)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-orange btn-lg shrink-0"
      >
        <Plus size={16} /> Novo associado
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
              className="relative w-full max-w-3xl rounded-[20px] bg-white my-4"
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
                    ASSOCIADOS · NOVO CADASTRO
                  </div>
                  <h2 className="display" style={{ fontSize: 26, letterSpacing: '-0.02em' }}>
                    Cadastrar associado
                  </h2>
                  <p className="text-sm mt-2" style={{ color: 'var(--ink-70)', maxWidth: 460 }}>
                    Empresa membro da ACIA. Pode receber cupons de desconto exclusivos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Fechar"
                  className="rounded-lg p-2 transition-colors hover:bg-paper-2"
                  style={{ color: 'var(--ink-50)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form action={createAssociateAction} className="p-7 space-y-6">
                <Section title="IDENTIFICAÇÃO">
                  {/* CNPJ + lookup status acima */}
                  <CnpjField
                    value={form.cnpj}
                    onChange={handleCnpjChange}
                    onLookup={() => lookupCnpj(form.cnpj)}
                    lookup={lookup}
                  />
                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field
                      label="RAZÃO SOCIAL *"
                      name="razao_social"
                      value={form.razao_social}
                      onChange={(v) => setField('razao_social', v)}
                      required
                    />
                    <Field
                      label="NOME FANTASIA"
                      name="nome_fantasia"
                      value={form.nome_fantasia}
                      onChange={(v) => setField('nome_fantasia', v)}
                    />
                    <Field
                      label="SEGMENTO"
                      name="segmento"
                      placeholder="Ex: Comércio"
                      value={form.segmento}
                      onChange={(v) => setField('segmento', v)}
                    />
                  </div>
                </Section>

                <Section title="CONTATO">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field
                      label="NOME DO RESPONSÁVEL"
                      name="contact_name"
                      value={form.contact_name}
                      onChange={(v) => setField('contact_name', v)}
                    />
                    <Field
                      label="EMAIL"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={(v) => setField('email', v)}
                    />
                    <Field
                      label="TELEFONE"
                      name="phone"
                      placeholder="(99) 99999-9999"
                      value={form.phone}
                      onChange={(v) => setField('phone', v)}
                    />
                  </div>
                </Section>

                <Section title="ENDEREÇO">
                  <div className="grid sm:grid-cols-3 gap-5">
                    <Field label="CEP" name="cep" value={form.cep} onChange={(v) => setField('cep', v)} />
                    <Field label="CIDADE" name="cidade" value={form.cidade} onChange={(v) => setField('cidade', v)} />
                    <Field label="UF" name="estado" placeholder="MA" value={form.estado} onChange={(v) => setField('estado', v)} />
                    <Field label="BAIRRO" name="bairro" value={form.bairro} onChange={(v) => setField('bairro', v)} />
                    <div className="sm:col-span-2 grid grid-cols-[1fr_120px] gap-5">
                      <Field label="RUA" name="rua" value={form.rua} onChange={(v) => setField('rua', v)} />
                      <Field label="NÚMERO" name="numero" value={form.numero} onChange={(v) => setField('numero', v)} />
                    </div>
                  </div>
                </Section>

                <Section title="OBSERVAÇÕES">
                  <Field
                    label="NOTAS INTERNAS"
                    name="notes"
                    textarea
                    placeholder="Informações adicionais (opcional)"
                    value={form.notes}
                    onChange={(v) => setField('notes', v)}
                  />
                </Section>

                <div
                  className="flex flex-wrap gap-3 pt-4"
                  style={{ borderTop: '1px solid var(--line)' }}
                >
                  <SubmitButton />
                  <button type="button" onClick={close} className="btn btn-ghost btn-lg">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  )
}

function CnpjField({
  value,
  onChange,
  onLookup,
  lookup,
}: {
  value: string
  onChange: (v: string) => void
  onLookup: () => void
  lookup: LookupState
}) {
  const digits = value.replace(/\D/g, '')
  const canLookup = digits.length === 14 && lookup.status !== 'loading'

  return (
    <label className="block">
      <span
        className="mono block text-[10px] tracking-[0.1em] mb-2"
        style={{ color: 'var(--ink-50)' }}
      >
        CNPJ * — preenchimento automático ao digitar
      </span>
      <div className="flex items-stretch gap-2">
        <input
          name="cnpj"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="00.000.000/0000-00"
          required
          className="admin-input flex-1 px-4 py-3 rounded-xl text-sm"
        />
        <button
          type="button"
          onClick={onLookup}
          disabled={!canLookup}
          title="Consultar dados na Receita"
          className="rounded-xl px-4 grid place-items-center transition-colors"
          style={{
            background: canLookup ? 'var(--azul-50)' : 'var(--paper-2)',
            color: canLookup ? 'var(--azul)' : 'var(--ink-50)',
            border: '1px solid var(--line)',
            cursor: canLookup ? 'pointer' : 'not-allowed',
          }}
        >
          {lookup.status === 'loading' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} />
          )}
        </button>
      </div>
      <LookupStatus state={lookup} />
    </label>
  )
}

function LookupStatus({ state }: { state: LookupState }) {
  if (state.status === 'idle') return null

  const styles: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
    loading: {
      bg: 'var(--azul-50)',
      color: 'var(--azul)',
      icon: <Loader2 size={12} className="animate-spin" />,
    },
    ok: {
      bg: 'rgba(166,206,58,0.18)',
      color: '#3d5a0a',
      icon: <CheckCircle2 size={12} />,
    },
    notfound: {
      bg: 'rgba(248,130,30,0.15)',
      color: '#b85d00',
      icon: <AlertCircle size={12} />,
    },
    error: {
      bg: '#fff1f2',
      color: '#b91c1c',
      icon: <AlertCircle size={12} />,
    },
  }

  const s = styles[state.status]
  const messages: Record<string, string> = {
    loading: 'Consultando Receita...',
    ok: state.status === 'ok' && state.message ? state.message : 'OK',
    notfound: 'CNPJ não encontrado na Receita Federal. Preencha manualmente.',
    error: state.status === 'error' ? state.message : 'Erro',
  }

  return (
    <div
      className="mt-2 rounded-lg px-3 py-2 text-xs flex items-center gap-2"
      style={{ background: s.bg, color: s.color }}
    >
      {s.icon}
      <span>{messages[state.status]}</span>
    </div>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-orange btn-lg"
      style={pending ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
    >
      {pending ? 'Criando...' : 'Cadastrar associado'}
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="mono text-[10px] tracking-[0.14em] mb-4"
        style={{ color: 'var(--ink-50)' }}
      >
        {title}
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  )
}

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  textarea,
}: {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  textarea?: boolean
}) {
  return (
    <label className="block">
      <span
        className="mono block text-[10px] tracking-[0.1em] mb-2"
        style={{ color: 'var(--ink-50)' }}
      >
        {label}
      </span>
      {textarea ? (
        <textarea
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={3}
          className="admin-textarea w-full px-4 py-3 rounded-xl text-sm"
        />
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="admin-input w-full px-4 py-3 rounded-xl text-sm"
        />
      )}
    </label>
  )
}
