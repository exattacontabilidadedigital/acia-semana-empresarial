'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateShort } from '@/lib/utils'
import Pagination from '@/components/ui/Pagination'
import { Plus, X, ToggleLeft, ToggleRight, Pencil, Loader2, Tag, CheckCircle, XCircle, TrendingUp } from 'lucide-react'
import type { Coupon, Event } from '@/types/database'

const PAGE_SIZE = 20

export default function AdminCuponsPage() {
  const supabase = createClient()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [events, setEvents] = useState<Pick<Event, 'id' | 'title'>[]>([])
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

  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      if (filterSearch && !c.code.toLowerCase().includes(filterSearch.toLowerCase())) return false
      if (filterStatus === 'active' && !c.active) return false
      if (filterStatus === 'inactive' && c.active) return false
      if (filterEvent === 'global' && c.event_id !== null) return false
      if (filterEvent && filterEvent !== 'global' && c.event_id !== Number(filterEvent)) return false
      return true
    })
  }, [coupons, filterSearch, filterStatus, filterEvent])

  const [form, setForm] = useState({
    code: '',
    discount_type: 'percentual',
    discount_value: 0,
    max_uses: '',
    valid_from: '',
    valid_until: '',
    event_id: '',
  })

  async function fetchData() {
    setLoading(true)
    const [{ data: couponsData }, { data: eventsData }] = await Promise.all([
      supabase.from('coupons').select('*').order('created_at', { ascending: false }),
      supabase.from('events').select('id, title').order('title'),
    ])
    setCoupons(couponsData ?? [])
    setEvents(eventsData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  function resetForm() {
    setForm({
      code: '',
      discount_type: 'percentual',
      discount_value: 0,
      max_uses: '',
      valid_from: '',
      valid_until: '',
      event_id: '',
    })
    setEditingId(null)
  }

  function handleEdit(coupon: Coupon) {
    setForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      max_uses: coupon.max_uses ? String(coupon.max_uses) : '',
      valid_from: coupon.valid_from ? coupon.valid_from.split('T')[0] : '',
      valid_until: coupon.valid_until ? coupon.valid_until.split('T')[0] : '',
      event_id: coupon.event_id ? String(coupon.event_id) : '',
    })
    setEditingId(coupon.id)
    setError('')
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        code: form.code.toUpperCase(),
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        event_id: form.event_id ? Number(form.event_id) : null,
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from('coupons')
          .update(payload)
          .eq('id', editingId)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('coupons')
          .insert(payload)
        if (insertError) throw insertError
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
    await supabase
      .from('coupons')
      .update({ active: !coupon.active })
      .eq('id', coupon.id)
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
        <Loader2 className="animate-spin text-purple" size={32} />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 font-montserrat">Cupons</h1>
        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-purple px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-dark"
        >
          <Plus size={18} />
          Novo Cupom
        </button>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-gray-900">{coupons.length}</p>
            </div>
            <div className="rounded-lg p-2.5 bg-purple/10"><Tag size={20} className="text-purple" /></div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Ativos</p>
              <p className="text-2xl font-bold text-gray-900">{coupons.filter((c) => c.active).length}</p>
            </div>
            <div className="rounded-lg p-2.5 bg-green-50"><CheckCircle size={20} className="text-green-500" /></div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-red-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Inativos</p>
              <p className="text-2xl font-bold text-gray-900">{coupons.filter((c) => !c.active).length}</p>
            </div>
            <div className="rounded-lg p-2.5 bg-red-50"><XCircle size={20} className="text-red-400" /></div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-cyan">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Usos Totais</p>
              <p className="text-2xl font-bold text-gray-900">{coupons.reduce((sum, c) => sum + c.current_uses, 0)}</p>
            </div>
            <div className="rounded-lg p-2.5 bg-cyan/10"><TrendingUp size={20} className="text-cyan" /></div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={filterSearch}
          onChange={(e) => { setFilterSearch(e.target.value); setPage(1) }}
          placeholder="Buscar por código..."
          className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
        />
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value as any); setPage(1) }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
        <select
          value={filterEvent}
          onChange={(e) => { setFilterEvent(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
        >
          <option value="">Todos os eventos</option>
          <option value="global">Cupons globais</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.title}</option>
          ))}
        </select>
        {(filterSearch || filterStatus !== 'all' || filterEvent) && (
          <button
            onClick={() => { setFilterSearch(''); setFilterStatus('all'); setFilterEvent(''); setPage(1) }}
            className="text-xs text-purple font-medium hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="px-6 py-3 font-medium">Código</th>
                <th className="px-6 py-3 font-medium">Tipo Desconto</th>
                <th className="px-6 py-3 font-medium">Valor</th>
                <th className="px-6 py-3 font-medium">Usos</th>
                <th className="px-6 py-3 font-medium">Validade</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCoupons.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((coupon) => (
                <tr key={coupon.id} className="text-gray-700 hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono font-semibold">{coupon.code}</td>
                  <td className="px-6 py-3">
                    {coupon.discount_type === 'percentual' ? 'Percentual' : 'Fixo'}
                  </td>
                  <td className="px-6 py-3">
                    {coupon.discount_type === 'percentual'
                      ? `${coupon.discount_value}%`
                      : `R$ ${coupon.discount_value.toFixed(2)}`}
                  </td>
                  <td className="px-6 py-3">
                    {coupon.current_uses}
                    {coupon.max_uses ? ` / ${coupon.max_uses}` : ' / ilimitado'}
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500">
                    {coupon.valid_from || coupon.valid_until ? (
                      <>
                        {coupon.valid_from ? formatDateShort(coupon.valid_from) : '—'}
                        {' → '}
                        {coupon.valid_until ? formatDateShort(coupon.valid_until) : '—'}
                      </>
                    ) : (
                      'Sem limite'
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        coupon.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {coupon.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(coupon)}
                        className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-purple"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => toggleActive(coupon)}
                        className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-purple"
                        title={coupon.active ? 'Desativar' : 'Ativar'}
                      >
                        {coupon.active ? <ToggleRight size={20} className="text-green-600" /> : <ToggleLeft size={20} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCoupons.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    {filterSearch || filterStatus !== 'all' || filterEvent
                      ? 'Nenhum cupom encontrado com esses filtros.'
                      : 'Nenhum cupom cadastrado.'}
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

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Editar Cupom' : 'Novo Cupom'}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm() }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Código</label>
                <input
                  type="text"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  required
                  placeholder="EX: DESCONTO20"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tipo Desconto</label>
                  <select
                    name="discount_type"
                    value={form.discount_type}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
                  >
                    <option value="percentual">Percentual (%)</option>
                    <option value="fixo">Fixo (R$)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Valor</label>
                  <input
                    type="number"
                    name="discount_value"
                    value={form.discount_value}
                    onChange={handleChange}
                    required
                    min={0}
                    step={form.discount_type === 'percentual' ? 1 : 0.01}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Máximo de Usos</label>
                <input
                  type="number"
                  name="max_uses"
                  value={form.max_uses}
                  onChange={handleChange}
                  placeholder="Deixe vazio para ilimitado"
                  min={1}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Data Início</label>
                  <input
                    type="date"
                    name="valid_from"
                    value={form.valid_from}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Data Fim</label>
                  <input
                    type="date"
                    name="valid_until"
                    value={form.valid_until}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Evento Específico (opcional)</label>
                <select
                  name="event_id"
                  value={form.event_id}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
                >
                  <option value="">Todos os eventos</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm() }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-purple px-4 py-2 text-sm font-medium text-white hover:bg-purple-dark disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Cupom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
