'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateShort } from '@/lib/utils'
import Pagination from '@/components/ui/Pagination'
import {
  Plus,
  X,
  ToggleLeft,
  ToggleRight,
  Pencil,
  Loader2,
  Tag,
  CheckCircle,
  XCircle,
  TrendingUp,
  Search,
} from 'lucide-react'
import type { Event } from '@/types/database'
import ModalPortal from '@/components/ui/ModalPortal'

const PAGE_SIZE = 20

type Associate = {
  id: string
  razao_social: string
  nome_fantasia: string | null
  cnpj: string
}

type Coupon = {
  id: number
  code: string
  discount_type: string
  discount_value: number
  max_uses: number | null
  current_uses: number
  valid_from: string | null
  valid_until: string | null
  active: boolean
  event_id: number | null
  scope: 'public' | 'associates_all' | 'associates_specific'
  max_uses_per_associate: number | null
  created_at: string
}

const SCOPE_PILL: Record<string, { bg: string; color: string; label: string }> = {
  public: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'PÚBLICO' },
  associates_all: { bg: 'rgba(86,198,208,0.18)', color: '#0a4650', label: 'TODOS ASSOC' },
  associates_specific: {
    bg: 'rgba(248,130,30,0.15)',
    color: '#b85d00',
    label: 'ESPECÍFICOS',
  },
}

function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, '')
  if (d.length !== 14) return cnpj
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}

export default function AdminCuponsPage() {
  const supabase = createClient()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [events, setEvents] = useState<Pick<Event, 'id' | 'title'>[]>([])
  const [associates, setAssociates] = useState<Associate[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)

  // Filtros
  const [filterSearch, setFilterSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterEvent, setFilterEvent] = useState('')
  const [filterScope, setFilterScope] = useState<'all' | 'public' | 'associates_all' | 'associates_specific'>('all')

  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      if (filterSearch && !c.code.toLowerCase().includes(filterSearch.toLowerCase())) return false
      if (filterStatus === 'active' && !c.active) return false
      if (filterStatus === 'inactive' && c.active) return false
      if (filterEvent === 'global' && c.event_id !== null) return false
      if (filterEvent && filterEvent !== 'global' && c.event_id !== Number(filterEvent)) return false
      if (filterScope !== 'all' && c.scope !== filterScope) return false
      return true
    })
  }, [coupons, filterSearch, filterStatus, filterEvent, filterScope])

  const [form, setForm] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 0,
    max_uses: '',
    max_uses_per_associate: '',
    valid_from: '',
    valid_until: '',
    event_id: '',
    scope: 'public' as 'public' | 'associates_all' | 'associates_specific',
  })
  const [selectedAssociates, setSelectedAssociates] = useState<Set<string>>(new Set())
  const [associateSearch, setAssociateSearch] = useState('')

  const filteredAssociates = useMemo(() => {
    const term = associateSearch.toLowerCase().trim()
    if (!term) return associates
    return associates.filter(
      (a) =>
        a.razao_social.toLowerCase().includes(term) ||
        (a.nome_fantasia ?? '').toLowerCase().includes(term) ||
        a.cnpj.replace(/\D/g, '').includes(term.replace(/\D/g, ''))
    )
  }, [associates, associateSearch])

  async function fetchData() {
    setLoading(true)
    const [{ data: couponsData }, { data: eventsData }, { data: assocData }] =
      await Promise.all([
        supabase.from('coupons').select('*').order('created_at', { ascending: false }),
        supabase.from('events').select('id, title').order('title'),
        supabase
          .from('associates')
          .select('id, razao_social, nome_fantasia, cnpj')
          .eq('status', 'active')
          .order('razao_social'),
      ])
    setCoupons((couponsData as Coupon[]) ?? [])
    setEvents(eventsData ?? [])
    setAssociates((assocData as Associate[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  function resetForm() {
    setForm({
      code: '',
      discount_type: 'percentage',
      discount_value: 0,
      max_uses: '',
      max_uses_per_associate: '',
      valid_from: '',
      valid_until: '',
      event_id: '',
      scope: 'public',
    })
    setSelectedAssociates(new Set())
    setAssociateSearch('')
    setEditingId(null)
  }

  async function handleEdit(coupon: Coupon) {
    setForm({
      code: coupon.code,
      discount_type: coupon.discount_type === 'percentual' ? 'percentage' : coupon.discount_type === 'fixo' ? 'fixed' : coupon.discount_type,
      discount_value: coupon.discount_value,
      max_uses: coupon.max_uses ? String(coupon.max_uses) : '',
      max_uses_per_associate: coupon.max_uses_per_associate
        ? String(coupon.max_uses_per_associate)
        : '',
      valid_from: coupon.valid_from ? coupon.valid_from.split('T')[0] : '',
      valid_until: coupon.valid_until ? coupon.valid_until.split('T')[0] : '',
      event_id: coupon.event_id ? String(coupon.event_id) : '',
      scope: (coupon.scope ?? 'public') as any,
    })
    setEditingId(coupon.id)
    setError('')
    setAssociateSearch('')

    // Carrega associados vinculados
    if (coupon.scope === 'associates_specific') {
      const { data: links } = await supabase
        .from('coupon_associates')
        .select('associate_id')
        .eq('coupon_id', coupon.id)
      setSelectedAssociates(new Set((links ?? []).map((l: any) => l.associate_id)))
    } else {
      setSelectedAssociates(new Set())
    }

    setShowModal(true)
  }

  function toggleAssociate(id: string) {
    setSelectedAssociates((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (form.scope === 'associates_specific' && selectedAssociates.size === 0) {
        throw new Error(
          'Selecione pelo menos 1 associado quando o escopo é "Associados específicos".'
        )
      }

      const payload = {
        code: form.code.toUpperCase(),
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        max_uses_per_associate:
          form.scope !== 'public' && form.max_uses_per_associate
            ? Number(form.max_uses_per_associate)
            : null,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        event_id: form.event_id ? Number(form.event_id) : null,
        scope: form.scope,
      }

      let couponId: number
      if (editingId) {
        const { error: updateError } = await supabase
          .from('coupons')
          .update(payload)
          .eq('id', editingId)
        if (updateError) throw updateError
        couponId = editingId
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('coupons')
          .insert(payload)
          .select('id')
          .single()
        if (insertError) throw insertError
        couponId = inserted.id
      }

      // Sincroniza vínculos com associados
      if (form.scope === 'associates_specific') {
        // Remove todos e re-insere os selecionados (mais simples e correto)
        await supabase.from('coupon_associates').delete().eq('coupon_id', couponId)
        const rows = Array.from(selectedAssociates).map((associate_id) => ({
          coupon_id: couponId,
          associate_id,
        }))
        if (rows.length > 0) {
          const { error: linkErr } = await supabase
            .from('coupon_associates')
            .insert(rows)
          if (linkErr) throw linkErr
        }
      } else {
        // Se mudou pra outro escopo, limpa vínculos antigos
        await supabase.from('coupon_associates').delete().eq('coupon_id', couponId)
      }

      setShowModal(false)
      resetForm()
      fetchData()
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar cupom')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(coupon: Coupon) {
    await supabase.from('coupons').update({ active: !coupon.active }).eq('id', coupon.id)
    fetchData()
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'discount_value' ? Number(value) : value,
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--azul)' }} />
      </div>
    )
  }

  const totalCount = coupons.length
  const activeCount = coupons.filter((c) => c.active).length
  const inactiveCount = coupons.filter((c) => !c.active).length
  const totalUses = coupons.reduce((sum, c) => sum + c.current_uses, 0)

  return (
    <div className="page-enter" style={{ color: 'var(--ink)' }}>
      {/* Header */}
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="eyebrow mb-4">
            <span className="dot" />
            PAINEL ADMINISTRATIVO · CUPONS
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
            Cupons
          </h1>
          <p
            className="mt-3"
            style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
          >
            Cupons públicos e exclusivos para associados. Defina escopo, validade
            e limite por associado.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="btn btn-orange btn-lg"
        >
          <Plus size={18} /> Novo Cupom
        </button>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatMini label="TOTAL" value={totalCount} icon={<Tag size={18} />} accent="var(--azul)" accentBg="var(--azul-50)" />
        <StatMini label="ATIVOS" value={activeCount} icon={<CheckCircle size={18} />} accent="var(--verde-600)" accentBg="rgba(166,206,58,0.18)" />
        <StatMini label="INATIVOS" value={inactiveCount} icon={<XCircle size={18} />} accent="#991b1b" accentBg="#fee2e2" />
        <StatMini label="USOS TOTAIS" value={totalUses} icon={<TrendingUp size={18} />} accent="var(--ciano-600)" accentBg="rgba(86,198,208,0.18)" />
      </div>

      {/* Listagem */}
      <div
        className="rounded-[20px] bg-white p-7"
        style={{ border: '1px solid var(--line)' }}
      >
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="min-w-0">
            <div
              className="mono text-[10px] tracking-[0.14em]"
              style={{ color: 'var(--ink-50)' }}
            >
              LISTAGEM
            </div>
            <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
              Todos os cupons
            </h2>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={filterSearch}
            onChange={(e) => { setFilterSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por código..."
            className="admin-input w-full max-w-xs px-4 py-3 rounded-xl text-sm"
          />
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value as any); setPage(1) }}
            className="admin-select px-4 py-3 rounded-xl text-sm"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
          <select
            value={filterScope}
            onChange={(e) => { setFilterScope(e.target.value as any); setPage(1) }}
            className="admin-select px-4 py-3 rounded-xl text-sm"
          >
            <option value="all">Todos os escopos</option>
            <option value="public">Público</option>
            <option value="associates_all">Todos os associados</option>
            <option value="associates_specific">Específicos</option>
          </select>
          <select
            value={filterEvent}
            onChange={(e) => { setFilterEvent(e.target.value); setPage(1) }}
            className="admin-select px-4 py-3 rounded-xl text-sm"
          >
            <option value="">Todos os eventos</option>
            <option value="global">Cupons globais</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
          {(filterSearch || filterStatus !== 'all' || filterEvent || filterScope !== 'all') && (
            <button
              onClick={() => {
                setFilterSearch(''); setFilterStatus('all'); setFilterEvent(''); setFilterScope('all'); setPage(1)
              }}
              className="mono text-[11px] tracking-[0.1em] hover:opacity-70 transition-opacity"
              style={{ color: 'var(--azul)' }}
            >
              LIMPAR FILTROS
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Código', 'Escopo', 'Desconto', 'Usos', 'Validade', 'Status', 'Ações'].map((h) => (
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
              {filteredCoupons.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((coupon) => {
                const scopeStyle = SCOPE_PILL[coupon.scope] ?? SCOPE_PILL.public
                const isPercent = coupon.discount_type === 'percentage' || coupon.discount_type === 'percentual'
                return (
                  <tr key={coupon.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td className="py-4 px-2 mono font-semibold whitespace-nowrap" style={{ color: 'var(--ink)' }}>
                      {coupon.code}
                    </td>
                    <td className="py-4 px-2">
                      <span
                        className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap"
                        style={{ background: scopeStyle.bg, color: scopeStyle.color }}
                      >
                        {scopeStyle.label}
                      </span>
                    </td>
                    <td className="py-4 px-2 mono whitespace-nowrap" style={{ color: 'var(--ink)' }}>
                      {isPercent ? `${coupon.discount_value}%` : `R$ ${coupon.discount_value.toFixed(2)}`}
                    </td>
                    <td className="py-4 px-2 mono whitespace-nowrap" style={{ color: 'var(--ink-70)' }}>
                      {coupon.current_uses}
                      {coupon.max_uses ? ` / ${coupon.max_uses}` : ' / ∞'}
                      {coupon.max_uses_per_associate ? (
                        <span className="ml-1 text-[10px]" style={{ color: 'var(--ink-50)' }}>
                          ({coupon.max_uses_per_associate}/assoc)
                        </span>
                      ) : null}
                    </td>
                    <td className="py-4 px-2 mono text-[11px] whitespace-nowrap" style={{ color: 'var(--ink-50)' }}>
                      {coupon.valid_from || coupon.valid_until ? (
                        <>
                          {coupon.valid_from ? formatDateShort(coupon.valid_from) : '—'}{' → '}
                          {coupon.valid_until ? formatDateShort(coupon.valid_until) : '—'}
                        </>
                      ) : (
                        'Sem limite'
                      )}
                    </td>
                    <td className="py-4 px-2">
                      <span
                        className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap"
                        style={
                          coupon.active
                            ? { background: 'rgba(166,206,58,0.18)', color: '#3d5a0a' }
                            : { background: 'var(--paper-2)', color: 'var(--ink-50)' }
                        }
                      >
                        {coupon.active ? 'ATIVO' : 'INATIVO'}
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(coupon)}
                          className="rounded-lg p-2 transition-colors hover:bg-[var(--paper-2)]"
                          style={{ color: 'var(--ink-50)' }}
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => toggleActive(coupon)}
                          className="rounded-lg p-2 transition-colors hover:bg-[var(--paper-2)]"
                          style={{ color: coupon.active ? 'var(--verde-600)' : 'var(--ink-50)' }}
                          title={coupon.active ? 'Desativar' : 'Ativar'}
                        >
                          {coupon.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredCoupons.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center mono text-[11px] tracking-[0.14em]"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    {filterSearch || filterStatus !== 'all' || filterEvent || filterScope !== 'all'
                      ? 'NENHUM CUPOM ENCONTRADO COM ESSES FILTROS'
                      : 'NENHUM CUPOM CADASTRADO'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={Math.ceil(filteredCoupons.length / PAGE_SIZE)}
          totalItems={filteredCoupons.length}
          onPageChange={setPage}
        />
      </div>

      {/* Modal */}
      {showModal && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 p-4 overflow-y-auto"
            onClick={() => { setShowModal(false); resetForm() }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-[20px] bg-white p-7 my-4"
              style={{ border: '1px solid var(--line)' }}
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className="mono text-[10px] tracking-[0.14em]"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    {editingId ? 'EDIÇÃO' : 'NOVO REGISTRO'}
                  </div>
                  <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
                    {editingId ? 'Editar Cupom' : 'Novo Cupom'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm() }}
                  className="rounded-lg p-2 transition-colors hover:bg-[var(--paper-2)]"
                  style={{ color: 'var(--ink-50)' }}
                >
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div
                  className="mb-4 rounded-xl p-3 text-sm"
                  style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Código + escopo */}
                <div>
                  <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>
                    CÓDIGO
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={form.code}
                    onChange={handleChange}
                    required
                    placeholder="EX: ASSOC10"
                    className="admin-input w-full px-4 py-3 rounded-xl text-sm uppercase"
                  />
                </div>

                <div>
                  <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>
                    ESCOPO
                  </label>
                  <select
                    name="scope"
                    value={form.scope}
                    onChange={handleChange}
                    className="admin-select w-full px-4 py-3 rounded-xl text-sm"
                  >
                    <option value="public">Público (qualquer comprador)</option>
                    <option value="associates_all">Todos os associados</option>
                    <option value="associates_specific">Associados específicos</option>
                  </select>
                  <p className="mt-1.5 text-xs" style={{ color: 'var(--ink-70)' }}>
                    {form.scope === 'public' && 'Qualquer pessoa pode usar este cupom.'}
                    {form.scope === 'associates_all' && 'Apenas CNPJs de associados ativos podem aplicar.'}
                    {form.scope === 'associates_specific' && 'Apenas os associados selecionados abaixo.'}
                  </p>
                </div>

                {/* Valor + tipo */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>
                      TIPO
                    </label>
                    <select
                      name="discount_type"
                      value={form.discount_type}
                      onChange={handleChange}
                      className="admin-select w-full px-4 py-3 rounded-xl text-sm"
                    >
                      <option value="percentage">Percentual (%)</option>
                      <option value="fixed">Fixo (R$)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>
                      VALOR
                    </label>
                    <input
                      type="number"
                      name="discount_value"
                      value={form.discount_value}
                      onChange={handleChange}
                      required
                      min={0}
                      step={form.discount_type === 'percentage' ? 1 : 0.01}
                      className="admin-input w-full px-4 py-3 rounded-xl text-sm"
                    />
                  </div>
                </div>

                {/* Limites */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>
                      MÁX. TOTAL
                    </label>
                    <input
                      type="number"
                      name="max_uses"
                      value={form.max_uses}
                      onChange={handleChange}
                      placeholder="Ilimitado"
                      min={1}
                      className="admin-input w-full px-4 py-3 rounded-xl text-sm"
                    />
                  </div>
                  <div style={form.scope === 'public' ? { opacity: 0.5 } : undefined}>
                    <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>
                      MÁX. POR ASSOCIADO
                    </label>
                    <input
                      type="number"
                      name="max_uses_per_associate"
                      value={form.max_uses_per_associate}
                      onChange={handleChange}
                      placeholder="Ilimitado"
                      min={1}
                      disabled={form.scope === 'public'}
                      className="admin-input w-full px-4 py-3 rounded-xl text-sm"
                    />
                  </div>
                </div>

                {/* Datas */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>
                      DATA INÍCIO
                    </label>
                    <input
                      type="date"
                      name="valid_from"
                      value={form.valid_from}
                      onChange={handleChange}
                      className="admin-input w-full px-4 py-3 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>
                      DATA FIM
                    </label>
                    <input
                      type="date"
                      name="valid_until"
                      value={form.valid_until}
                      onChange={handleChange}
                      className="admin-input w-full px-4 py-3 rounded-xl text-sm"
                    />
                  </div>
                </div>

                {/* Evento específico */}
                <div>
                  <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>
                    EVENTO ESPECÍFICO (OPCIONAL)
                  </label>
                  <select
                    name="event_id"
                    value={form.event_id}
                    onChange={handleChange}
                    className="admin-select w-full px-4 py-3 rounded-xl text-sm"
                  >
                    <option value="">Todos os eventos</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.title}</option>
                    ))}
                  </select>
                </div>

                {/* Multi-select associados */}
                {form.scope === 'associates_specific' && (
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <label className="mono text-[10px] tracking-[0.1em]" style={{ color: 'var(--ink-50)' }}>
                        ASSOCIADOS VINCULADOS · {selectedAssociates.size} SELECIONADO(S)
                      </label>
                      {selectedAssociates.size > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedAssociates(new Set())}
                          className="mono text-[10px] tracking-[0.1em] hover:opacity-70"
                          style={{ color: 'var(--azul)' }}
                        >
                          LIMPAR
                        </button>
                      )}
                    </div>
                    <div
                      className="rounded-xl"
                      style={{ border: '1px solid var(--line)' }}
                    >
                      <div
                        className="relative px-3 py-2"
                        style={{ borderBottom: '1px solid var(--line)' }}
                      >
                        <Search
                          size={12}
                          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                          style={{ color: 'var(--ink-50)' }}
                        />
                        <input
                          type="text"
                          value={associateSearch}
                          onChange={(e) => setAssociateSearch(e.target.value)}
                          placeholder="Filtrar por nome ou CNPJ..."
                          className="w-full pl-6 text-sm bg-transparent outline-none"
                          style={{ color: 'var(--ink)' }}
                        />
                      </div>
                      <div className="max-h-56 overflow-y-auto">
                        {filteredAssociates.length === 0 && (
                          <div
                            className="text-center py-6 mono text-[10px] tracking-[0.14em]"
                            style={{ color: 'var(--ink-50)' }}
                          >
                            {associates.length === 0 ? 'NENHUM ASSOCIADO ATIVO CADASTRADO' : 'NENHUM RESULTADO'}
                          </div>
                        )}
                        {filteredAssociates.map((a) => {
                          const checked = selectedAssociates.has(a.id)
                          return (
                            <label
                              key={a.id}
                              className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors hover:bg-paper-2"
                              style={
                                checked ? { background: 'var(--paper-2)' } : undefined
                              }
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleAssociate(a.id)}
                                className="cursor-pointer"
                              />
                              <div className="min-w-0 flex-1">
                                <div
                                  className="text-sm font-medium truncate"
                                  style={{ color: 'var(--ink)' }}
                                >
                                  {a.nome_fantasia || a.razao_social}
                                </div>
                                <div
                                  className="mono text-[10px] tracking-[0.06em]"
                                  style={{ color: 'var(--ink-50)' }}
                                >
                                  {formatCnpj(a.cnpj)}
                                </div>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div
                  className="flex justify-end gap-3 pt-3"
                  style={{ borderTop: '1px solid var(--line)' }}
                >
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm() }}
                    className="btn btn-ghost"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn btn-orange"
                    style={saving ? { opacity: 0.5 } : undefined}
                  >
                    {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Cupom'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}

function StatMini({
  label,
  value,
  icon,
  accent,
  accentBg,
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  accent: string
  accentBg: string
}) {
  return (
    <div
      className="rounded-[20px] bg-white p-5 overflow-hidden"
      style={{
        border: '1px solid var(--line)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div
          className="mono text-[10px] tracking-[0.14em] truncate min-w-0 flex-1"
          style={{ color: 'var(--ink-50)' }}
        >
          {label}
        </div>
        <div
          className="rounded-lg p-2 shrink-0"
          style={{ background: accentBg, color: accent }}
        >
          {icon}
        </div>
      </div>
      <div
        className="display truncate"
        style={{
          fontSize: 'clamp(28px, 3.4vw, 36px)',
          letterSpacing: '-0.03em',
          lineHeight: 1,
          color: 'var(--ink)',
        }}
      >
        {value}
      </div>
    </div>
  )
}
