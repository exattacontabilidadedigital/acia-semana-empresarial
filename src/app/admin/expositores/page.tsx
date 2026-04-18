'use client'

import { useEffect, useState } from 'react'
import {
  Building2, CheckCircle, XCircle, Clock, Eye, X, Loader2, Plus,
  Search, Phone, Mail, MapPin, Tag, Pencil, Check, Ban,
} from 'lucide-react'

interface Exhibitor {
  id: number
  company_name: string
  cnpj: string | null
  responsible_name: string
  responsible_role: string | null
  email: string
  phone: string
  segment: string
  description: string | null
  stand_size: string
  logo_url: string | null
  status: string
  admin_notes: string | null
  stand_number: string | null
  created_at: string
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  approved: { label: 'Aprovado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-800', icon: XCircle },
  cancelled: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800', icon: Ban },
}

const standLabels: Record<string, string> = {
  pequeno: 'Pequeno (3x3m)',
  medio: 'Médio (4x4m)',
  grande: 'Grande (6x4m)',
  indefinido: 'Indefinido',
}

function formatPhone(p: string) {
  const d = p.replace(/\D/g, '')
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))
}

export default function AdminExpositoresPage() {
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSearch, setFilterSearch] = useState('')
  const [selected, setSelected] = useState<Exhibitor | null>(null)
  const [modal, setModal] = useState<'details' | 'approve' | 'edit' | 'create' | null>(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  // Approve/reject form
  const [adminNotes, setAdminNotes] = useState('')
  const [standNumber, setStandNumber] = useState('')

  // Edit form
  const [editForm, setEditForm] = useState<Partial<Exhibitor>>({})

  // Logo upload
  const [logoFile, setLogoFile] = useState<File | null>(null)

  // Create form
  const [createForm, setCreateForm] = useState({
    company_name: '', cnpj: '', responsible_name: '', responsible_role: '',
    email: '', phone: '', segment: '', description: '', stand_size: 'indefinido',
    stand_number: '', admin_notes: '', status: 'approved',
  })

  function resetCreateForm() {
    setCreateForm({
      company_name: '', cnpj: '', responsible_name: '', responsible_role: '',
      email: '', phone: '', segment: '', description: '', stand_size: 'indefinido',
      stand_number: '', admin_notes: '', status: 'approved',
    })
    setLogoFile(null)
  }

  async function fetchData() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus) params.set('status', filterStatus)
    if (filterSearch) params.set('search', filterSearch)
    const res = await fetch(`/api/exhibitors?${params}`)
    const data = await res.json()
    setExhibitors(data.exhibitors ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [filterStatus, filterSearch])

  function openDetails(ex: Exhibitor) {
    setSelected(ex)
    setAdminNotes(ex.admin_notes || '')
    setStandNumber(ex.stand_number || '')
    setFeedback('')
    setModal('details')
  }

  function openApprove(ex: Exhibitor) {
    setSelected(ex)
    setAdminNotes(ex.admin_notes || '')
    setStandNumber(ex.stand_number || '')
    setFeedback('')
    setModal('approve')
  }

  function openEdit(ex: Exhibitor) {
    setSelected(ex)
    setEditForm({ ...ex })
    setLogoFile(null)
    setFeedback('')
    setModal('edit')
  }

  async function handleAction(action: string) {
    if (!selected) return
    setSaving(true)
    setFeedback('')
    try {
      const res = await fetch('/api/exhibitors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, action, admin_notes: adminNotes, stand_number: standNumber }),
      })
      const data = await res.json()
      setFeedback(data.message || data.error)
      if (res.ok) {
        fetchData()
        setTimeout(() => setModal(null), 1500)
      }
    } catch { setFeedback('Erro de conexão') }
    finally { setSaving(false) }
  }

  async function uploadLogo(): Promise<string | null> {
    if (!logoFile) return null
    try {
      const formData = new FormData()
      formData.append('file', logoFile)
      formData.append('folder', 'exhibitors')
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const data = await res.json()
      return data.url || null
    } catch { return null }
  }

  async function handleCreate() {
    setSaving(true)
    setFeedback('')
    try {
      const logoUrl = await uploadLogo()

      const res = await fetch('/api/exhibitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          phone: createForm.phone.replace(/\D/g, ''),
          cnpj: createForm.cnpj.replace(/\D/g, '') || undefined,
          logo_url: logoUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFeedback(data.error || 'Erro ao criar')
        setSaving(false)
        return
      }

      // Se status é approved, aprovar automaticamente
      if (createForm.status === 'approved') {
        // Buscar o expositor criado pelo email
        const listRes = await fetch(`/api/exhibitors?search=${encodeURIComponent(createForm.email)}`)
        const listData = await listRes.json()
        const created = listData.exhibitors?.find((e: any) => e.email === createForm.email && e.status === 'pending')
        if (created) {
          await fetch('/api/exhibitors', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: created.id,
              action: 'approve',
              stand_number: createForm.stand_number,
              admin_notes: createForm.admin_notes,
            }),
          })
        }
      }

      setFeedback('Expositor criado com sucesso')
      fetchData()
      setTimeout(() => { setModal(null); resetCreateForm() }, 1500)
    } catch { setFeedback('Erro de conexão') }
    finally { setSaving(false) }
  }

  async function handleEdit() {
    if (!selected) return
    setSaving(true)
    setFeedback('')
    try {
      const logoUrl = await uploadLogo()

      const res = await fetch('/api/exhibitors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, action: 'update', ...editForm, ...(logoUrl ? { logo_url: logoUrl } : {}) }),
      })
      const data = await res.json()
      setFeedback(data.message || data.error)
      if (res.ok) {
        fetchData()
        setTimeout(() => setModal(null), 1500)
      }
    } catch { setFeedback('Erro de conexão') }
    finally { setSaving(false) }
  }

  const counts = {
    pending: exhibitors.filter((e) => e.status === 'pending').length,
    approved: exhibitors.filter((e) => e.status === 'approved').length,
    rejected: exhibitors.filter((e) => e.status === 'rejected').length,
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 font-montserrat">Expositores</h1>
        <button
          onClick={() => { resetCreateForm(); setFeedback(''); setModal('create' as any) }}
          className="inline-flex items-center gap-2 rounded-lg bg-purple px-4 py-2 text-sm font-medium text-white hover:bg-purple-dark"
        >
          <Plus size={18} />
          Novo Expositor
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-yellow-400 flex items-center gap-3">
          <Clock className="text-yellow-500" size={24} />
          <div>
            <p className="text-2xl font-bold">{counts.pending}</p>
            <p className="text-xs text-gray-500">Pendentes</p>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-green-500 flex items-center gap-3">
          <CheckCircle className="text-green-500" size={24} />
          <div>
            <p className="text-2xl font-bold">{counts.approved}</p>
            <p className="text-xs text-gray-500">Aprovados</p>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-red-400 flex items-center gap-3">
          <XCircle className="text-red-400" size={24} />
          <div>
            <p className="text-2xl font-bold">{counts.rejected}</p>
            <p className="text-xs text-gray-500">Rejeitados</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            placeholder="Buscar empresa, responsável, email..."
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-purple focus:outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todos os status</option>
          <option value="pending">Pendentes</option>
          <option value="approved">Aprovados</option>
          <option value="rejected">Rejeitados</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-purple" size={32} />
        </div>
      ) : (
        <div className="rounded-lg bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="px-6 py-3 font-medium">Empresa</th>
                  <th className="px-6 py-3 font-medium">Responsável</th>
                  <th className="px-6 py-3 font-medium">Segmento</th>
                  <th className="px-6 py-3 font-medium">Estande</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Data</th>
                  <th className="px-6 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {exhibitors.map((ex) => {
                  const st = statusConfig[ex.status] || statusConfig.pending
                  return (
                    <tr key={ex.id} className="text-gray-700 hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          {ex.logo_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={ex.logo_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-purple/10 flex items-center justify-center flex-shrink-0">
                              <Building2 size={14} className="text-purple" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{ex.company_name}</p>
                            <p className="text-xs text-gray-400">{ex.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">{ex.responsible_name}</td>
                      <td className="px-6 py-3">
                        <span className="inline-block rounded-full bg-purple/10 px-2 py-0.5 text-xs font-medium text-purple">
                          {ex.segment}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs">
                        {ex.stand_number && <span className="font-semibold text-purple">{ex.stand_number} — </span>}
                        {standLabels[ex.stand_size] || ex.stand_size}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs">{formatDate(ex.created_at)}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openDetails(ex)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-purple" title="Detalhes">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => openEdit(ex)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-purple" title="Editar">
                            <Pencil size={14} />
                          </button>
                          {ex.status === 'pending' && (
                            <>
                              <button onClick={() => openApprove(ex)} className="rounded p-1 text-gray-400 hover:bg-green-100 hover:text-green-600" title="Aprovar">
                                <Check size={14} />
                              </button>
                              <button onClick={() => { setSelected(ex); handleAction('reject') }} className="rounded p-1 text-gray-400 hover:bg-red-100 hover:text-red-600" title="Rejeitar">
                                <Ban size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {exhibitors.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                      Nenhum expositor encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== MODAL DETALHES ===== */}
      {modal === 'details' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setModal(null)}>
          <div className="mx-4 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-purple to-purple-dark p-5 rounded-t-lg flex items-center justify-between">
              <div>
                <p className="text-xs text-white/70 uppercase tracking-wide">Expositor</p>
                <p className="text-white font-bold">{selected.company_name}</p>
              </div>
              <button onClick={() => setModal(null)} className="text-white/70 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-gray-400">CNPJ</p><p className="font-medium">{selected.cnpj || '—'}</p></div>
                <div><p className="text-xs text-gray-400">Segmento</p><p className="font-medium">{selected.segment}</p></div>
                <div><p className="text-xs text-gray-400">Responsável</p><p className="font-medium">{selected.responsible_name}</p>{selected.responsible_role && <p className="text-xs text-gray-500">{selected.responsible_role}</p>}</div>
                <div><p className="text-xs text-gray-400">Contato</p><p className="font-medium">{selected.email}</p><p className="text-xs text-gray-500">{formatPhone(selected.phone)}</p></div>
                <div><p className="text-xs text-gray-400">Estande</p><p className="font-medium">{selected.stand_number || '—'} — {standLabels[selected.stand_size] || selected.stand_size}</p></div>
                <div><p className="text-xs text-gray-400">Status</p><span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${(statusConfig[selected.status] || statusConfig.pending).color}`}>{(statusConfig[selected.status] || statusConfig.pending).label}</span></div>
              </div>
              {selected.description && (
                <div><p className="text-xs text-gray-400 mb-1">Descrição</p><p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selected.description}</p></div>
              )}
              {selected.admin_notes && (
                <div><p className="text-xs text-gray-400 mb-1">Notas do Admin</p><p className="text-sm text-gray-700 bg-yellow-50 rounded-lg p-3">{selected.admin_notes}</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL APROVAR ===== */}
      {modal === 'approve' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setModal(null)}>
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-1">Aprovar Expositor</h2>
            <p className="text-sm text-gray-500 mb-4">{selected.company_name}</p>

            {feedback && <div className="mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">{feedback}</div>}

            <div className="space-y-3 mb-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Número do Estande</label>
                <input type="text" value={standNumber} onChange={(e) => setStandNumber(e.target.value)} placeholder="Ex: A-12" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Observações</label>
                <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} placeholder="Notas internas..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={() => handleAction('approve')} disabled={saving} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                {saving ? 'Aprovando...' : 'Aprovar e Notificar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL EDITAR ===== */}
      {modal === 'edit' && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setModal(null)}>
          <div className="mx-4 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Editar Expositor</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {feedback && <div className="mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">{feedback}</div>}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">Empresa</label>
                <input type="text" value={editForm.company_name || ''} onChange={(e) => setEditForm((p) => ({ ...p, company_name: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">CNPJ</label>
                <input type="text" value={editForm.cnpj || ''} onChange={(e) => setEditForm((p) => ({ ...p, cnpj: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Segmento</label>
                <input type="text" value={editForm.segment || ''} onChange={(e) => setEditForm((p) => ({ ...p, segment: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Responsável</label>
                <input type="text" value={editForm.responsible_name || ''} onChange={(e) => setEditForm((p) => ({ ...p, responsible_name: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Cargo</label>
                <input type="text" value={editForm.responsible_role || ''} onChange={(e) => setEditForm((p) => ({ ...p, responsible_role: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Email</label>
                <input type="email" value={editForm.email || ''} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Telefone</label>
                <input type="text" value={editForm.phone || ''} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Estande</label>
                <input type="text" value={editForm.stand_number || ''} onChange={(e) => setEditForm((p) => ({ ...p, stand_number: e.target.value }))} placeholder="Ex: A-12" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Tamanho</label>
                <select value={editForm.stand_size || ''} onChange={(e) => setEditForm((p) => ({ ...p, stand_size: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="pequeno">Pequeno (3x3m)</option>
                  <option value="medio">Médio (4x4m)</option>
                  <option value="grande">Grande (6x4m)</option>
                  <option value="indefinido">Indefinido</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">Logo da Empresa</label>
                {editForm.logo_url && (
                  <div className="mb-2 flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={editForm.logo_url} alt="Logo atual" className="w-10 h-10 rounded object-cover" />
                    <span className="text-xs text-gray-400">Logo atual</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-purple/10 file:px-3 file:py-1 file:text-sm file:text-purple"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">Notas Admin</label>
                <textarea value={editForm.admin_notes || ''} onChange={(e) => setEditForm((p) => ({ ...p, admin_notes: e.target.value }))} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleEdit} disabled={saving} className="rounded-lg bg-purple px-4 py-2 text-sm font-medium text-white hover:bg-purple-dark disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL CRIAR ===== */}
      {modal === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setModal(null)}>
          <div className="mx-4 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Novo Expositor</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {feedback && <div className={`mb-3 rounded-lg p-3 text-sm ${feedback.includes('sucesso') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{feedback}</div>}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">Empresa *</label>
                <input type="text" value={createForm.company_name} onChange={(e) => setCreateForm((p) => ({ ...p, company_name: e.target.value }))} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">CNPJ</label>
                <input type="text" value={createForm.cnpj} onChange={(e) => setCreateForm((p) => ({ ...p, cnpj: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Segmento *</label>
                <select value={createForm.segment} onChange={(e) => setCreateForm((p) => ({ ...p, segment: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Selecione...</option>
                  {['Alimentício', 'Vestuário', 'Tecnologia', 'Saúde', 'Serviços', 'Indústria', 'Agronegócio', 'Educação', 'Outro'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Responsável *</label>
                <input type="text" value={createForm.responsible_name} onChange={(e) => setCreateForm((p) => ({ ...p, responsible_name: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Cargo</label>
                <input type="text" value={createForm.responsible_role} onChange={(e) => setCreateForm((p) => ({ ...p, responsible_role: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Email *</label>
                <input type="email" value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Telefone *</label>
                <input type="text" value={createForm.phone} onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Nº Estande</label>
                <input type="text" value={createForm.stand_number} onChange={(e) => setCreateForm((p) => ({ ...p, stand_number: e.target.value }))} placeholder="Ex: A-12" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Tamanho</label>
                <select value={createForm.stand_size} onChange={(e) => setCreateForm((p) => ({ ...p, stand_size: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="pequeno">Pequeno (3x3m)</option>
                  <option value="medio">Médio (4x4m)</option>
                  <option value="grande">Grande (6x4m)</option>
                  <option value="indefinido">Indefinido</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Status inicial</label>
                <select value={createForm.status} onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="approved">Aprovado</option>
                  <option value="pending">Pendente</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">Logo da Empresa</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-purple/10 file:px-3 file:py-1 file:text-sm file:text-purple"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">Descrição</label>
                <textarea value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">Notas Admin</label>
                <textarea value={createForm.admin_notes} onChange={(e) => setCreateForm((p) => ({ ...p, admin_notes: e.target.value }))} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleCreate} disabled={saving || !createForm.company_name || !createForm.email || !createForm.responsible_name || !createForm.phone || !createForm.segment} className="rounded-lg bg-purple px-4 py-2 text-sm font-medium text-white hover:bg-purple-dark disabled:opacity-50">
                {saving ? 'Criando...' : 'Criar Expositor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
