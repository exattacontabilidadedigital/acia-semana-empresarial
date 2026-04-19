import Link from 'next/link'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, CheckCircle, XCircle, Briefcase, Tag, User } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  updateAssociateAction,
  setAssociateStatusAction,
} from '@/app/admin/associados/actions'
import ConfirmDeleteAssociateButton from '@/components/admin/ConfirmDeleteAssociateButton'
import AssociateLogoUpload from '@/components/admin/AssociateLogoUpload'
import { formatCurrency, formatDateShort } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const STATUS_PILL: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a', label: 'ATIVO' },
  inactive: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'INATIVO' },
}

export default async function AssociadoDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { saved?: string; created?: string; error?: string; logo_saved?: string }
}) {
  const admin = createAdminClient()

  const { data: assoc } = await admin
    .from('associates')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (!assoc) notFound()

  const [{ data: linkedCoupons }, { data: inscriptions }] = await Promise.all([
    admin
      .from('coupon_associates')
      .select('coupon_id, coupons:coupon_id ( id, code, scope, discount_type, discount_value, active )')
      .eq('associate_id', params.id),
    admin
      .from('inscriptions')
      .select(
        'id, nome, total_amount, payment_status, created_at, coupon_id, events ( title ), coupons:coupon_id ( code )'
      )
      .eq('associate_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const status = STATUS_PILL[assoc.status] ?? STATUS_PILL.inactive

  return (
    <div className="page-enter">
      <Link
        href="/admin/associados"
        className="mono text-[11px] tracking-[0.14em] inline-flex items-center gap-1 mb-6 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--ink-50)' }}
      >
        <ArrowLeft size={12} /> VOLTAR
      </Link>

      <div className="mb-8 flex items-start gap-5 flex-wrap">
        <div
          className="rounded-2xl overflow-hidden grid place-items-center shrink-0"
          style={{
            width: 88,
            height: 88,
            background: 'var(--azul-50)',
            color: 'var(--azul)',
            border: '1px solid var(--line)',
          }}
        >
          {assoc.logo_url ? (
            <Image
              src={assoc.logo_url}
              alt={assoc.razao_social}
              width={88}
              height={88}
              className="object-cover w-full h-full"
              unoptimized
            />
          ) : (
            <Briefcase size={32} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="eyebrow mb-3">
            <span className="dot" />
            ASSOCIADO
          </div>
          <h1
            className="display"
            style={{ fontSize: 'clamp(32px, 4vw, 44px)' }}
          >
            {assoc.nome_fantasia || assoc.razao_social}
          </h1>
          {assoc.nome_fantasia && (
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-70)' }}>
              {assoc.razao_social}
            </p>
          )}
        </div>
        <span
          className="mono inline-flex items-center px-3 py-1.5 rounded-full text-[11px] tracking-[0.1em] font-medium whitespace-nowrap"
          style={{ background: status.bg, color: status.color }}
        >
          {status.label}
        </span>
      </div>

      {searchParams.created && (
        <Banner color="success">Associado cadastrado.</Banner>
      )}
      {searchParams.saved && (
        <Banner color="success">Alterações salvas.</Banner>
      )}
      {searchParams.logo_saved && (
        <Banner color="success">Logo atualizado.</Banner>
      )}
      {searchParams.error && (
        <Banner color="error">{searchParams.error}</Banner>
      )}

      {/* Form de edição + ações */}
      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <form
          action={updateAssociateAction}
          className="lg:col-span-2 rounded-[20px] bg-white p-7 space-y-6"
          style={{ border: '1px solid var(--line)' }}
        >
          <input type="hidden" name="id" value={assoc.id} />
          <SectionTitle eyebrow="DADOS" title="Editar associado" />

          <Section title="IDENTIFICAÇÃO">
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="RAZÃO SOCIAL *" name="razao_social" defaultValue={assoc.razao_social} required />
              <Field label="NOME FANTASIA" name="nome_fantasia" defaultValue={assoc.nome_fantasia ?? ''} />
              <Field label="CNPJ *" name="cnpj" defaultValue={assoc.cnpj} required />
              <Field label="SEGMENTO" name="segmento" defaultValue={assoc.segmento ?? ''} />
            </div>
          </Section>

          <Section title="CONTATO">
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="RESPONSÁVEL" name="contact_name" defaultValue={assoc.contact_name ?? ''} />
              <Field label="EMAIL" name="email" type="email" defaultValue={assoc.email ?? ''} />
              <Field label="TELEFONE" name="phone" defaultValue={assoc.phone ?? ''} />
            </div>
          </Section>

          <Section title="ENDEREÇO">
            <div className="grid sm:grid-cols-3 gap-5">
              <Field label="CEP" name="cep" defaultValue={assoc.cep ?? ''} />
              <Field label="CIDADE" name="cidade" defaultValue={assoc.cidade ?? ''} />
              <Field label="UF" name="estado" defaultValue={assoc.estado ?? ''} />
              <Field label="BAIRRO" name="bairro" defaultValue={assoc.bairro ?? ''} />
              <div className="sm:col-span-2 grid grid-cols-[1fr_120px] gap-5">
                <Field label="RUA" name="rua" defaultValue={assoc.rua ?? ''} />
                <Field label="NÚMERO" name="numero" defaultValue={assoc.numero ?? ''} />
              </div>
            </div>
          </Section>

          <Section title="OBSERVAÇÕES">
            <Field label="NOTAS INTERNAS" name="notes" textarea defaultValue={assoc.notes ?? ''} />
          </Section>

          <div
            className="flex flex-wrap gap-3 pt-4"
            style={{ borderTop: '1px solid var(--line)' }}
          >
            <button type="submit" className="btn btn-orange btn-lg">
              Salvar alterações
            </button>
          </div>
        </form>

        <div
          className="rounded-[20px] bg-white p-7 h-fit"
          style={{ border: '1px solid var(--line)' }}
        >
          <SectionTitle eyebrow="AÇÕES" title="Status" />
          <div className="mt-5 space-y-2">
            <form action={setAssociateStatusAction}>
              <input type="hidden" name="id" value={assoc.id} />
              <input type="hidden" name="status" value="active" />
              <button
                type="submit"
                disabled={assoc.status === 'active'}
                className="btn btn-ghost w-full justify-center"
                style={
                  assoc.status === 'active'
                    ? { opacity: 0.5, pointerEvents: 'none' }
                    : undefined
                }
              >
                <CheckCircle size={14} /> Ativar
              </button>
            </form>
            <form action={setAssociateStatusAction}>
              <input type="hidden" name="id" value={assoc.id} />
              <input type="hidden" name="status" value="inactive" />
              <button
                type="submit"
                disabled={assoc.status === 'inactive'}
                className="btn btn-ghost w-full justify-center"
                style={
                  assoc.status === 'inactive'
                    ? { opacity: 0.5, pointerEvents: 'none' }
                    : undefined
                }
              >
                <XCircle size={14} /> Inativar
              </button>
            </form>
            <ConfirmDeleteAssociateButton id={assoc.id} />
          </div>

          {/* Logo upload */}
          <div className="mt-7 pt-6" style={{ borderTop: '1px solid var(--line)' }}>
            <SectionTitle eyebrow="LOGO" title="Imagem da empresa" />
            <div className="mt-5">
              <AssociateLogoUpload
                id={assoc.id}
                currentUrl={assoc.logo_url}
                alt={assoc.razao_social}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cupons vinculados */}
      <div
        className="rounded-[20px] bg-white p-7 mb-5"
        style={{ border: '1px solid var(--line)' }}
      >
        <SectionTitle
          eyebrow={`${linkedCoupons?.length ?? 0} CUPONS VINCULADOS`}
          title="Cupons exclusivos"
        />
        {(!linkedCoupons || linkedCoupons.length === 0) && (
          <Empty>NENHUM CUPOM ESPECÍFICO PARA ESTE ASSOCIADO</Empty>
        )}
        {linkedCoupons && linkedCoupons.length > 0 && (
          <div className="overflow-x-auto -mx-2 mt-5">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['Código', 'Desconto', 'Status'].map((h) => (
                    <th
                      key={h}
                      className="mono text-[10px] tracking-[0.1em] py-3 px-2 font-medium uppercase"
                      style={{ color: 'var(--ink-50)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linkedCoupons.map((row: any) => {
                  const c = row.coupons
                  if (!c) return null
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td className="py-3 px-2 mono font-semibold" style={{ color: 'var(--ink)' }}>
                        <div className="flex items-center gap-2">
                          <Tag size={12} style={{ color: 'var(--laranja)' }} /> {c.code}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-sm" style={{ color: 'var(--ink-70)' }}>
                        {c.discount_type === 'percentage'
                          ? `${c.discount_value}%`
                          : formatCurrency(c.discount_value)}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap"
                          style={
                            c.active
                              ? { background: 'rgba(166,206,58,0.18)', color: '#3d5a0a' }
                              : { background: 'var(--paper-2)', color: 'var(--ink-50)' }
                          }
                        >
                          {c.active ? 'ATIVO' : 'INATIVO'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Compras */}
      <div
        className="rounded-[20px] bg-white p-7"
        style={{ border: '1px solid var(--line)' }}
      >
        <SectionTitle
          eyebrow={`${inscriptions?.length ?? 0} COMPRAS`}
          title="Histórico de compras"
        />
        {(!inscriptions || inscriptions.length === 0) && (
          <Empty>NENHUMA COMPRA REGISTRADA</Empty>
        )}
        {inscriptions && inscriptions.length > 0 && (
          <div className="overflow-x-auto -mx-2 mt-5">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['Participante', 'Evento', 'Cupom', 'Valor', 'Status', 'Data'].map((h) => (
                    <th
                      key={h}
                      className="mono text-[10px] tracking-[0.1em] py-3 px-2 font-medium uppercase"
                      style={{ color: 'var(--ink-50)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inscriptions.map((insc: any) => (
                  <tr key={insc.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td
                      className="py-3 px-2 max-w-[180px] truncate"
                      style={{ color: 'var(--ink)' }}
                      title={insc.nome}
                    >
                      <div className="flex items-center gap-2">
                        <User size={12} style={{ color: 'var(--ink-50)' }} />
                        {insc.nome}
                      </div>
                    </td>
                    <td
                      className="py-3 px-2 max-w-[200px] truncate text-xs"
                      style={{ color: 'var(--ink-70)' }}
                      title={insc.events?.title ?? ''}
                    >
                      {insc.events?.title ?? '—'}
                    </td>
                    <td className="py-3 px-2 mono text-[11px]" style={{ color: 'var(--laranja)' }}>
                      {insc.coupons?.code ?? '—'}
                    </td>
                    <td className="py-3 px-2 mono whitespace-nowrap" style={{ color: 'var(--ink)' }}>
                      {formatCurrency(insc.total_amount)}
                    </td>
                    <td className="py-3 px-2">
                      <PaymentPill status={insc.payment_status} />
                    </td>
                    <td
                      className="py-3 px-2 mono text-[11px] whitespace-nowrap"
                      style={{ color: 'var(--ink-50)' }}
                    >
                      {formatDateShort(insc.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function PaymentPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    confirmed: { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a', label: 'CONFIRMADO' },
    free: { bg: 'rgba(86,198,208,0.18)', color: '#0a4650', label: 'GRATUITO' },
    pending: { bg: 'rgba(248,130,30,0.15)', color: '#b85d00', label: 'PENDENTE' },
    failed: { bg: '#fee2e2', color: '#991b1b', label: 'FALHOU' },
    refunded: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'ESTORNADO' },
  }
  const s = map[status] ?? { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: status?.toUpperCase() ?? '—' }
  return (
    <span
      className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
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

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div
        className="mono text-[10px] tracking-[0.14em]"
        style={{ color: 'var(--ink-50)' }}
      >
        {eyebrow}
      </div>
      <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
        {title}
      </h2>
    </div>
  )
}

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  required,
  textarea,
}: {
  label: string
  name: string
  defaultValue?: string
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
          defaultValue={defaultValue}
          required={required}
          rows={3}
          className="admin-textarea w-full px-4 py-3 rounded-xl text-sm"
        />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={defaultValue}
          required={required}
          className="admin-input w-full px-4 py-3 rounded-xl text-sm"
        />
      )}
    </label>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-center py-10 mt-5 mono text-[11px] tracking-[0.14em]"
      style={{ color: 'var(--ink-50)' }}
    >
      {children}
    </div>
  )
}

function Banner({
  color,
  children,
}: {
  color: 'success' | 'error' | 'warning'
  children: React.ReactNode
}) {
  const map = {
    success: { bg: 'rgba(166,206,58,0.10)', border: '1px solid rgba(166,206,58,0.4)', color: '#3d5a0a' },
    error: { bg: '#fff1f2', border: '1px solid #fecdd3', color: '#b91c1c' },
    warning: { bg: 'rgba(248,130,30,0.08)', border: '1px solid rgba(248,130,30,0.3)', color: '#b85d00' },
  }
  const s = map[color]
  return (
    <div
      className="mb-6 p-3 rounded-xl text-sm"
      style={{ background: s.bg, border: s.border, color: s.color }}
    >
      {children}
    </div>
  )
}
