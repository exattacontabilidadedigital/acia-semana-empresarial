'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import ModalPortal from '@/components/ui/ModalPortal'
import {
  Building2, CheckCircle, XCircle, Clock, Eye, X, Loader2, Plus,
  Search, Pencil, Check, Ban,
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

interface StandOption {
  number: string
  type: string
  size: string
  price: number
  status: string
}

const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: 'rgba(248,130,30,0.15)', color: '#b85d00', label: 'PENDENTE' },
  approved: { bg: 'rgba(166,206,58,0.18)', color: '#3d5a0a', label: 'APROVADO' },
  rejected: { bg: '#fee2e2', color: '#991b1b', label: 'REJEITADO' },
  cancelled: { bg: 'var(--paper-2)', color: 'var(--ink-50)', label: 'CANCELADO' },
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
  const [allStands, setAllStands] = useState<StandOption[]>([])
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

  useEffect(() => {
    fetch('/api/stands')
      .then((r) => r.json())
      .then((d) => setAllStands(d.stands || []))
      .catch(() => setAllStands([]))
  }, [modal])

  function standOptions(currentNumber: string | null | undefined) {
    const opts = allStands.filter((s) => s.status === 'available' || s.number === currentNumber)
    return opts.sort((a, b) => a.number.localeCompare(b.number, 'pt', { numeric: true }))
  }

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

  const inputStyle = { border: '1px solid var(--line)', color: 'var(--ink)' } as const
  const inputClass = 'admin-input w-full px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors'

  return (
    <div className="page-enter" style={{ color: 'var(--ink)' }}>

      {/* Header */}
      <div className="mb-10">
        <div className="eyebrow mb-4">
          <span className="dot" />
          PAINEL ADMINISTRATIVO · FEIRA
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
          Expositores
        </h1>
        <p
          className="mt-3"
          style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
        >
          Aprove, gerencie e acompanhe as empresas inscritas para a feira.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatTile label="PENDENTES" value={counts.pending} icon={<Clock size={18} />} accent="var(--laranja)" accentBg="rgba(248,130,30,0.15)" />
        <StatTile label="APROVADOS" value={counts.approved} icon={<CheckCircle size={18} />} accent="#3d5a0a" accentBg="rgba(166,206,58,0.18)" />
        <StatTile label="REJEITADOS" value={counts.rejected} icon={<XCircle size={18} />} accent="#991b1b" accentBg="#fee2e2" />
      </div>

      {/* Action bar */}
      <div className="mb-6 flex items-center justify-end">
        <button
          onClick={() => { resetCreateForm(); setFeedback(''); setModal('create' as any) }}
          className="btn btn-orange"
        >
          <Plus size={18} />
          Novo Expositor
        </button>
      </div>

      {/* Filters card */}
      <div className="mb-6 rounded-[20px] bg-white p-5" style={{ border: '1px solid var(--line)' }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-50)' }} />
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Buscar empresa, responsável, email..."
              className="admin-input w-full pl-9 pr-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors"
              style={inputStyle}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="admin-input px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors"
            style={inputStyle}
          >
            <option value="">Todos os status</option>
            <option value="pending">Pendentes</option>
            <option value="approved">Aprovados</option>
            <option value="rejected">Rejeitados</option>
          </select>
        </div>
      </div>

      {/* Table card */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin" size={32} style={{ color: 'var(--azul)' }} />
        </div>
      ) : (
        <div className="rounded-[20px] bg-white p-7" style={{ border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="min-w-0">
              <div className="mono text-[10px] tracking-[0.14em]" style={{ color: 'var(--ink-50)' }}>
                EMPRESAS CADASTRADAS
              </div>
              <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
                Lista de expositores
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['Empresa', 'Responsável', 'Segmento', 'Estande', 'Status', 'Data', 'Ações'].map((h) => (
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
                {exhibitors.map((ex) => {
                  const st = statusStyles[ex.status] ?? statusStyles.pending
                  return (
                    <tr key={ex.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-3 min-w-0">
                          {ex.logo_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={ex.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" style={{ border: '1px solid var(--line)' }} />
                          ) : (
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: 'var(--azul-50)', color: 'var(--azul)' }}
                            >
                              <Building2 size={14} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[200px]" style={{ color: 'var(--ink)' }} title={ex.company_name}>
                              {ex.company_name}
                            </p>
                            <p className="mono text-[10px] tracking-[0.04em] mt-0.5 truncate max-w-[200px]" style={{ color: 'var(--ink-50)' }} title={ex.email}>
                              {ex.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td
                        className="py-4 px-2 max-w-[160px] truncate"
                        style={{ color: 'var(--ink-70)' }}
                        title={ex.responsible_name}
                      >
                        {ex.responsible_name}
                      </td>
                      <td className="py-4 px-2">
                        <span
                          className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap"
                          style={{ background: 'var(--azul-50)', color: 'var(--azul)' }}
                        >
                          {ex.segment}
                        </span>
                      </td>
                      <td className="py-4 px-2 mono text-[11px] whitespace-nowrap" style={{ color: 'var(--ink-70)' }}>
                        {ex.stand_number && (
                          <span className="font-semibold" style={{ color: 'var(--azul)' }}>{ex.stand_number} — </span>
                        )}
                        {standLabels[ex.stand_size] || ex.stand_size}
                      </td>
                      <td className="py-4 px-2">
                        <span
                          className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap"
                          style={{ background: st.bg, color: st.color }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td
                        className="py-4 px-2 mono text-[11px] whitespace-nowrap"
                        style={{ color: 'var(--ink-50)' }}
                      >
                        {formatDate(ex.created_at)}
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openDetails(ex)}
                            className="rounded p-1.5 transition-colors hover:bg-[var(--paper-2)]"
                            style={{ color: 'var(--ink-50)' }}
                            title="Detalhes"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => openEdit(ex)}
                            className="rounded p-1.5 transition-colors hover:bg-[var(--paper-2)]"
                            style={{ color: 'var(--ink-50)' }}
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          {ex.status === 'pending' && (
                            <>
                              <button
                                onClick={() => openApprove(ex)}
                                className="rounded p-1.5 transition-colors"
                                style={{ color: '#3d5a0a' }}
                                title="Aprovar"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => { setSelected(ex); handleAction('reject') }}
                                className="rounded p-1.5 transition-colors"
                                style={{ color: '#991b1b' }}
                                title="Rejeitar"
                              >
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
                    <td
                      colSpan={7}
                      className="py-16 text-center mono text-[11px] tracking-[0.14em]"
                      style={{ color: 'var(--ink-50)' }}
                    >
                      NENHUM EXPOSITOR ENCONTRADO
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
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModal(null)}>
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[20px] bg-white p-7"
            style={{ border: '1px solid var(--line)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="min-w-0">
                <div className="mono text-[10px] tracking-[0.14em]" style={{ color: 'var(--ink-50)' }}>
                  EXPOSITOR
                </div>
                <h2 className="display mt-1 truncate" style={{ fontSize: 22, letterSpacing: '-0.02em' }} title={selected.company_name}>
                  {selected.company_name}
                </h2>
              </div>
              <button
                onClick={() => setModal(null)}
                className="rounded p-1.5 transition-colors hover:bg-[var(--paper-2)] shrink-0"
                style={{ color: 'var(--ink-50)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <DetailField label="CNPJ" value={selected.cnpj || '—'} />
                <DetailField label="SEGMENTO" value={selected.segment} />
                <DetailField
                  label="RESPONSÁVEL"
                  value={selected.responsible_name}
                  hint={selected.responsible_role || undefined}
                />
                <DetailField
                  label="CONTATO"
                  value={selected.email}
                  hint={formatPhone(selected.phone)}
                />
                <DetailField
                  label="ESTANDE"
                  value={`${selected.stand_number || '—'} — ${standLabels[selected.stand_size] || selected.stand_size}`}
                />
                <div>
                  <p className="mono text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>STATUS</p>
                  <span
                    className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap"
                    style={{
                      background: (statusStyles[selected.status] || statusStyles.pending).bg,
                      color: (statusStyles[selected.status] || statusStyles.pending).color,
                    }}
                  >
                    {(statusStyles[selected.status] || statusStyles.pending).label}
                  </span>
                </div>
              </div>

              {selected.description && (
                <div>
                  <p className="mono text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>DESCRIÇÃO</p>
                  <p className="text-sm rounded-xl p-4" style={{ background: 'var(--paper-2)', color: 'var(--ink-70)' }}>
                    {selected.description}
                  </p>
                </div>
              )}
              {selected.admin_notes && (
                <div>
                  <p className="mono text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>NOTAS DO ADMIN</p>
                  <p className="text-sm rounded-xl p-4" style={{ background: 'rgba(248,130,30,0.08)', color: '#b85d00' }}>
                    {selected.admin_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* ===== MODAL APROVAR ===== */}
      {modal === 'approve' && selected && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModal(null)}>
          <div
            className="w-full max-w-md rounded-[20px] bg-white p-7"
            style={{ border: '1px solid var(--line)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="min-w-0">
                <div className="mono text-[10px] tracking-[0.14em]" style={{ color: 'var(--ink-50)' }}>
                  AÇÃO
                </div>
                <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
                  Aprovar Expositor
                </h2>
                <p className="mono text-[11px] mt-1 truncate" style={{ color: 'var(--ink-50)' }}>{selected.company_name}</p>
              </div>
              <button
                onClick={() => setModal(null)}
                className="rounded p-1.5 transition-colors hover:bg-[var(--paper-2)] shrink-0"
                style={{ color: 'var(--ink-50)' }}
              >
                <X size={20} />
              </button>
            </div>

            {feedback && (
              <div className="mb-4 rounded-xl p-3 text-sm" style={{ background: 'rgba(166,206,58,0.18)', color: '#3d5a0a' }}>
                {feedback}
              </div>
            )}

            <div className="space-y-4 mb-5">
              <div>
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>NÚMERO DO ESTANDE</label>
                <select
                  value={standNumber}
                  onChange={(e) => setStandNumber(e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                >
                  <option value="">— Sem stand atribuído —</option>
                  {standOptions(selected.stand_number).map((s) => (
                    <option key={s.number} value={s.number}>
                      {s.number} · {s.type} · {s.size} · R$ {s.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>OBSERVAÇÕES</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  placeholder="Notas internas..."
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="btn btn-ghost">Cancelar</button>
              <button
                onClick={() => handleAction('approve')}
                disabled={saving}
                className="btn btn-orange disabled:opacity-50"
              >
                {saving ? 'Aprovando...' : 'Aprovar e Notificar'}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* ===== MODAL EDITAR ===== */}
      {modal === 'edit' && selected && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModal(null)}>
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[20px] bg-white p-7"
            style={{ border: '1px solid var(--line)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="min-w-0">
                <div className="mono text-[10px] tracking-[0.14em]" style={{ color: 'var(--ink-50)' }}>
                  EDITAR
                </div>
                <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
                  Editar Expositor
                </h2>
              </div>
              <button
                onClick={() => setModal(null)}
                className="rounded p-1.5 transition-colors hover:bg-[var(--paper-2)] shrink-0"
                style={{ color: 'var(--ink-50)' }}
              >
                <X size={20} />
              </button>
            </div>

            {feedback && (
              <div className="mb-4 rounded-xl p-3 text-sm" style={{ background: 'rgba(166,206,58,0.18)', color: '#3d5a0a' }}>
                {feedback}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="col-span-2">
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>EMPRESA</label>
                <input type="text" value={editForm.company_name || ''} onChange={(e) => setEditForm((p) => ({ ...p, company_name: e.target.value }))} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>CNPJ</label>
                <input type="text" value={editForm.cnpj || ''} onChange={(e) => setEditForm((p) => ({ ...p, cnpj: e.target.value }))} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>SEGMENTO</label>
                <input type="text" value={editForm.segment || ''} onChange={(e) => setEditForm((p) => ({ ...p, segment: e.target.value }))} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>RESPONSÁVEL</label>
                <input type="text" value={editForm.responsible_name || ''} onChange={(e) => setEditForm((p) => ({ ...p, responsible_name: e.target.value }))} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>CARGO</label>
                <input type="text" value={editForm.responsible_role || ''} onChange={(e) => setEditForm((p) => ({ ...p, responsible_role: e.target.value }))} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>EMAIL</label>
                <input type="email" value={editForm.email || ''} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>TELEFONE</label>
                <input type="text" value={editForm.phone || ''} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>ESTANDE</label>
                <select
                  value={editForm.stand_number || ''}
                  onChange={(e) => setEditForm((p) => ({ ...p, stand_number: e.target.value }))}
                  className={inputClass}
                  style={inputStyle}
                >
                  <option value="">— Sem stand atribuído —</option>
                  {standOptions(editForm.stand_number).map((s) => (
                    <option key={s.number} value={s.number}>
                      {s.number} · {s.type} · R$ {s.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>TAMANHO</label>
                <select value={editForm.stand_size || ''} onChange={(e) => setEditForm((p) => ({ ...p, stand_size: e.target.value }))} className={inputClass} style={inputStyle}>
                  <option value="pequeno">Pequeno (3x3m)</option>
                  <option value="medio">Médio (4x4m)</option>
                  <option value="grande">Grande (6x4m)</option>
                  <option value="indefinido">Indefinido</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>LOGO DA EMPRESA</label>
                {editForm.logo_url && (
                  <div className="mb-2 flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={editForm.logo_url} alt="Logo atual" className="w-10 h-10 rounded-lg object-cover" style={{ border: '1px solid var(--line)' }} />
                    <span className="mono text-[10px] tracking-[0.06em]" style={{ color: 'var(--ink-50)' }}>LOGO ATUAL</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                  className="admin-input w-full px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors file:mr-3 file:rounded-full file:border-0 file:bg-[var(--azul-50)] file:px-3 file:py-1 file:text-xs file:text-[var(--azul)]"
                  style={inputStyle}
                />
              </div>
              <div className="col-span-2">
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>NOTAS ADMIN</label>
                <textarea value={editForm.admin_notes || ''} onChange={(e) => setEditForm((p) => ({ ...p, admin_notes: e.target.value }))} rows={2} className={inputClass} style={inputStyle} />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleEdit} disabled={saving} className="btn btn-orange disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* ===== MODAL CRIAR ===== */}
      {modal === 'create' && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModal(null)}>
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[20px] bg-white p-7"
            style={{ border: '1px solid var(--line)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="min-w-0">
                <div className="mono text-[10px] tracking-[0.14em]" style={{ color: 'var(--ink-50)' }}>
                  NOVO CADASTRO
                </div>
                <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
                  Novo Expositor
                </h2>
              </div>
              <button
                onClick={() => setModal(null)}
                className="rounded p-1.5 transition-colors hover:bg-[var(--paper-2)] shrink-0"
                style={{ color: 'var(--ink-50)' }}
              >
                <X size={20} />
              </button>
            </div>

            {feedback && (
              <div
                className="mb-4 rounded-xl p-3 text-sm"
                style={
                  feedback.includes('sucesso')
                    ? { background: 'rgba(166,206,58,0.18)', color: '#3d5a0a' }
                    : { background: '#fee2e2', color: '#991b1b' }
                }
              >
                {feedback}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="col-span-2">
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>EMPRESA *</label>
                <input type="text" value={createForm.company_name} onChange={(e) => setCreateForm((p) => ({ ...p, company_name: e.target.value }))} required className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>CNPJ</label>
                <input type="text" value={createForm.cnpj} onChange={(e) => setCreateForm((p) => ({ ...p, cnpj: e.target.value }))} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>SEGMENTO *</label>
                <select value={createForm.segment} onChange={(e) => setCreateForm((p) => ({ ...p, segment: e.target.value }))} className={inputClass} style={inputStyle}>
                  <option value="">Selecione...</option>
                  {['Alimentício', 'Vestuário', 'Tecnologia', 'Saúde', 'Serviços', 'Indústria', 'Agronegócio', 'Educação', 'Outro'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>RESPONSÁVEL *</label>
                <input type="text" value={createForm.responsible_name} onChange={(e) => setCreateForm((p) => ({ ...p, responsible_name: e.target.value }))} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>CARGO</label>
                <input type="text" value={createForm.responsible_role} onChange={(e) => setCreateForm((p) => ({ ...p, responsible_role: e.target.value }))} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>EMAIL *</label>
                <input type="email" value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>TELEFONE *</label>
                <input type="text" value={createForm.phone} onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>Nº ESTANDE</label>
                <select
                  value={createForm.stand_number}
                  onChange={(e) => setCreateForm((p) => ({ ...p, stand_number: e.target.value }))}
                  className={inputClass}
                  style={inputStyle}
                >
                  <option value="">— Sem stand atribuído —</option>
                  {standOptions(createForm.stand_number).map((s) => (
                    <option key={s.number} value={s.number}>
                      {s.number} · {s.type} · R$ {s.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>TAMANHO</label>
                <select value={createForm.stand_size} onChange={(e) => setCreateForm((p) => ({ ...p, stand_size: e.target.value }))} className={inputClass} style={inputStyle}>
                  <option value="pequeno">Pequeno (3x3m)</option>
                  <option value="medio">Médio (4x4m)</option>
                  <option value="grande">Grande (6x4m)</option>
                  <option value="indefinido">Indefinido</option>
                </select>
              </div>
              <div>
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>STATUS INICIAL</label>
                <select value={createForm.status} onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value }))} className={inputClass} style={inputStyle}>
                  <option value="approved">Aprovado</option>
                  <option value="pending">Pendente</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>LOGO DA EMPRESA</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                  className="admin-input w-full px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors file:mr-3 file:rounded-full file:border-0 file:bg-[var(--azul-50)] file:px-3 file:py-1 file:text-xs file:text-[var(--azul)]"
                  style={inputStyle}
                />
              </div>
              <div className="col-span-2">
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>DESCRIÇÃO</label>
                <textarea value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} rows={2} className={inputClass} style={inputStyle} />
              </div>
              <div className="col-span-2">
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>NOTAS ADMIN</label>
                <textarea value={createForm.admin_notes} onChange={(e) => setCreateForm((p) => ({ ...p, admin_notes: e.target.value }))} rows={2} className={inputClass} style={inputStyle} />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="btn btn-ghost">Cancelar</button>
              <button
                onClick={handleCreate}
                disabled={saving || !createForm.company_name || !createForm.email || !createForm.responsible_name || !createForm.phone || !createForm.segment}
                className="btn btn-orange disabled:opacity-50"
              >
                {saving ? 'Criando...' : 'Criar Expositor'}
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  )
}

function StatTile({
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
      className="h-full rounded-[20px] bg-white p-5 overflow-hidden"
      style={{ border: '1px solid var(--line)' }}
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

function DetailField({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="min-w-0">
      <p className="mono text-[10px] tracking-[0.1em] mb-1" style={{ color: 'var(--ink-50)' }}>{label}</p>
      <p className="font-medium truncate" style={{ color: 'var(--ink)' }} title={value}>{value}</p>
      {hint && <p className="mono text-[11px] mt-0.5 truncate" style={{ color: 'var(--ink-50)' }}>{hint}</p>}
    </div>
  )
}
