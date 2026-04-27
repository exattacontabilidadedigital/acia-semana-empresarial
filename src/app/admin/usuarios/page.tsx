'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import ModalPortal from '@/components/ui/ModalPortal'
import PasswordInput from '@/components/ui/PasswordInput'
import {
  UserPlus,
  UserCog,
  X,
  Loader2,
  Shield,
  User,
  Key,
  Pencil,
  Clock,
} from 'lucide-react'

interface UserData {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  roles: string[]
  created_at: string
  last_sign_in: string | null
}

interface Role {
  id: number
  name: string
}

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState<'create' | 'edit' | 'password' | null>(null)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role_ids: [] as number[],
  })

  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    role_ids: [] as number[],
  })

  const [passwordForm, setPasswordForm] = useState({
    new_password: '',
  })

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      setUsers(data.users ?? [])
      setRoles(data.roles ?? [])
    } catch {
      setError('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  function openEdit(user: UserData) {
    setEditingUser(user)
    setEditForm({
      full_name: user.full_name ?? '',
      phone: user.phone ?? '',
      role_ids: roles.filter((r) => user.roles.includes(r.name)).map((r) => r.id),
    })
    setError('')
    setSuccess('')
    setShowModal('edit')
  }

  function openPassword(user: UserData) {
    setEditingUser(user)
    setPasswordForm({ new_password: '' })
    setError('')
    setSuccess('')
    setShowModal('password')
  }

  function toggleRole(roleId: number, form: 'create' | 'edit') {
    if (form === 'create') {
      setCreateForm((prev) => ({
        ...prev,
        role_ids: prev.role_ids.includes(roleId)
          ? prev.role_ids.filter((id) => id !== roleId)
          : [...prev.role_ids, roleId],
      }))
    } else {
      setEditForm((prev) => ({
        ...prev,
        role_ids: prev.role_ids.includes(roleId)
          ? prev.role_ids.filter((id) => id !== roleId)
          : [...prev.role_ids, roleId],
      }))
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...createForm }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess('Usuário criado com sucesso')
      setCreateForm({ email: '', password: '', full_name: '', phone: '', role_ids: [] })
      fetchData()
      setTimeout(() => setShowModal(null), 1500)
    } catch (err: any) {
      setError(err.message || 'Erro ao criar usuário')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      // Atualizar perfil
      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          user_id: editingUser.id,
          full_name: editForm.full_name,
          phone: editForm.phone,
        }),
      })
      // Atualizar roles
      await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_roles',
          user_id: editingUser.id,
          role_ids: editForm.role_ids,
        }),
      })
      setSuccess('Usuário atualizado')
      fetchData()
      setTimeout(() => setShowModal(null), 1500)
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar')
    } finally {
      setSaving(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!editingUser) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_password',
          user_id: editingUser.id,
          new_password: passwordForm.new_password,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess('Senha alterada com sucesso')
      setTimeout(() => setShowModal(null), 1500)
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar senha')
    } finally {
      setSaving(false)
    }
  }

  function formatDate(d: string) {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date(d))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--azul)' }} />
      </div>
    )
  }

  const roleStyles: Record<string, { bg: string; color: string }> = {
    admin: { bg: '#fee2e2', color: '#991b1b' },
    organizer: { bg: 'var(--azul-50)', color: 'var(--azul)' },
    partner: { bg: 'rgba(86,198,208,0.18)', color: '#0a4650' },
  }

  const totalUsers = users.length
  const admins = users.filter((u) => u.roles.includes('admin')).length
  const partners = users.filter((u) => u.roles.includes('partner')).length
  const noRole = users.filter((u) => u.roles.length === 0).length

  return (
    <div className="page-enter" style={{ color: 'var(--ink)' }}>

      {/* Header */}
      <div className="mb-10">
        <div className="eyebrow mb-4">
          <span className="dot" />
          PAINEL ADMINISTRATIVO · ACESSO
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(40px, 5vw, 56px)' }}>
          Usuários
        </h1>
        <p
          className="mt-3"
          style={{ color: 'var(--ink-70)', fontSize: 15, maxWidth: 560 }}
        >
          Gerencie contas, papéis e permissões do painel administrativo.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="TOTAL" value={totalUsers} icon={<UserCog size={18} />} accent="var(--azul)" accentBg="var(--azul-50)" />
        <StatTile label="ADMINS" value={admins} icon={<Shield size={18} />} accent="#991b1b" accentBg="#fee2e2" />
        <StatTile label="PARCEIROS" value={partners} icon={<User size={18} />} accent="var(--ciano-600)" accentBg="rgba(86,198,208,0.18)" />
        <StatTile label="SEM ROLE" value={noRole} icon={<Clock size={18} />} accent="var(--ink-50)" accentBg="var(--paper-2)" />
      </div>

      {/* Action bar */}
      <div className="mb-6 flex items-center justify-end">
        <button
          onClick={() => {
            setCreateForm({ email: '', password: '', full_name: '', phone: '', role_ids: [] })
            setError('')
            setSuccess('')
            setShowModal('create')
          }}
          className="btn btn-orange"
        >
          <UserPlus size={18} />
          Novo Usuário
        </button>
      </div>

      {/* Table card */}
      <div className="rounded-[20px] bg-white p-7" style={{ border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="min-w-0">
            <div className="mono text-[10px] tracking-[0.14em]" style={{ color: 'var(--ink-50)' }}>
              CONTAS CADASTRADAS
            </div>
            <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
              Lista de usuários
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Nome', 'Email', 'Telefone', 'Roles', 'Criado em', 'Último login', 'Ações'].map((h) => (
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
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td
                    className="py-4 px-2 font-medium max-w-[180px] truncate"
                    style={{ color: 'var(--ink)' }}
                    title={user.full_name || '—'}
                  >
                    {user.full_name || '—'}
                  </td>
                  <td
                    className="py-4 px-2 max-w-[220px] truncate"
                    style={{ color: 'var(--ink-70)' }}
                    title={user.email}
                  >
                    {user.email}
                  </td>
                  <td
                    className="py-4 px-2 mono whitespace-nowrap"
                    style={{ color: 'var(--ink-70)' }}
                  >
                    {user.phone || '—'}
                  </td>
                  <td className="py-4 px-2">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length > 0 ? user.roles.map((role) => {
                        const style = roleStyles[role] ?? { bg: 'var(--paper-2)', color: 'var(--ink-50)' }
                        return (
                          <span
                            key={role}
                            className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap uppercase"
                            style={{ background: style.bg, color: style.color }}
                          >
                            {role}
                          </span>
                        )
                      }) : (
                        <span
                          className="mono inline-flex items-center px-2 py-1 rounded-full text-[10px] tracking-[0.08em] font-medium whitespace-nowrap uppercase"
                          style={{ background: 'var(--paper-2)', color: 'var(--ink-50)' }}
                        >
                          SEM ROLE
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    className="py-4 px-2 mono text-[11px] whitespace-nowrap"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    {formatDate(user.created_at)}
                  </td>
                  <td
                    className="py-4 px-2 mono text-[11px] whitespace-nowrap"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    {user.last_sign_in ? formatDate(user.last_sign_in) : '—'}
                  </td>
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(user)}
                        className="rounded p-1.5 transition-colors hover:bg-[var(--paper-2)]"
                        style={{ color: 'var(--ink-50)' }}
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => openPassword(user)}
                        className="rounded p-1.5 transition-colors hover:bg-[var(--paper-2)]"
                        style={{ color: 'var(--ink-50)' }}
                        title="Resetar senha"
                      >
                        <Key size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center mono text-[11px] tracking-[0.14em]"
                    style={{ color: 'var(--ink-50)' }}
                  >
                    NENHUM USUÁRIO ENCONTRADO
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== MODAL CRIAR ==================== */}
      {showModal === 'create' && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-lg rounded-[20px] bg-white p-7"
            style={{ border: '1px solid var(--line)' }}
          >
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="min-w-0">
                <div className="mono text-[10px] tracking-[0.14em]" style={{ color: 'var(--ink-50)' }}>
                  NOVA CONTA
                </div>
                <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
                  Novo Usuário
                </h2>
              </div>
              <button
                onClick={() => setShowModal(null)}
                className="rounded p-1.5 transition-colors hover:bg-[var(--paper-2)] shrink-0"
                style={{ color: 'var(--ink-50)' }}
              >
                <X size={20} />
              </button>
            </div>

            {error && <div className="mb-4 rounded-xl p-3 text-sm" style={{ background: '#fee2e2', color: '#991b1b' }}>{error}</div>}
            {success && <div className="mb-4 rounded-xl p-3 text-sm" style={{ background: 'rgba(166,206,58,0.18)', color: '#3d5a0a' }}>{success}</div>}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>EMAIL *</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                    required
                    className="admin-input w-full px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors"
                    style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
                  />
                </div>
                <div className="col-span-2">
                  <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>SENHA *</label>
                  <PasswordInput
                    value={createForm.password}
                    onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                    required
                    minLength={6}
                    className="admin-input w-full pl-4 pr-11 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors"
                    style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
                  />
                </div>
                <div>
                  <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>NOME COMPLETO</label>
                  <input
                    type="text"
                    value={createForm.full_name}
                    onChange={(e) => setCreateForm((p) => ({ ...p, full_name: e.target.value }))}
                    className="admin-input w-full px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors"
                    style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
                  />
                </div>
                <div>
                  <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>TELEFONE</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                    className="admin-input w-full px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors"
                    style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
                  />
                </div>
              </div>

              <div>
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>ROLES</label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => {
                    const active = createForm.role_ids.includes(role.id)
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleRole(role.id, 'create')}
                        className="mono inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] tracking-[0.08em] font-medium uppercase transition-colors"
                        style={{
                          background: active ? 'var(--azul-50)' : 'white',
                          color: active ? 'var(--azul)' : 'var(--ink-70)',
                          border: `1px solid ${active ? 'var(--azul)' : 'var(--line)'}`,
                        }}
                      >
                        <Shield size={10} />
                        {role.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(null)} className="btn btn-ghost">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn btn-orange disabled:opacity-50">
                  {saving ? 'Criando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* ==================== MODAL EDITAR ==================== */}
      {showModal === 'edit' && editingUser && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-lg rounded-[20px] bg-white p-7"
            style={{ border: '1px solid var(--line)' }}
          >
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="min-w-0">
                <div className="mono text-[10px] tracking-[0.14em]" style={{ color: 'var(--ink-50)' }}>
                  EDITAR CONTA
                </div>
                <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
                  Editar Usuário
                </h2>
                <p className="mono text-[11px] mt-1 truncate" style={{ color: 'var(--ink-50)' }}>{editingUser.email}</p>
              </div>
              <button
                onClick={() => setShowModal(null)}
                className="rounded p-1.5 transition-colors hover:bg-[var(--paper-2)] shrink-0"
                style={{ color: 'var(--ink-50)' }}
              >
                <X size={20} />
              </button>
            </div>

            {error && <div className="mb-4 rounded-xl p-3 text-sm" style={{ background: '#fee2e2', color: '#991b1b' }}>{error}</div>}
            {success && <div className="mb-4 rounded-xl p-3 text-sm" style={{ background: 'rgba(166,206,58,0.18)', color: '#3d5a0a' }}>{success}</div>}

            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>NOME COMPLETO</label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
                    className="admin-input w-full px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors"
                    style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
                  />
                </div>
                <div>
                  <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>TELEFONE</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                    className="admin-input w-full px-4 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors"
                    style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
                  />
                </div>
              </div>

              <div>
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>ROLES</label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => {
                    const active = editForm.role_ids.includes(role.id)
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleRole(role.id, 'edit')}
                        className="mono inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] tracking-[0.08em] font-medium uppercase transition-colors"
                        style={{
                          background: active ? 'var(--azul-50)' : 'white',
                          color: active ? 'var(--azul)' : 'var(--ink-70)',
                          border: `1px solid ${active ? 'var(--azul)' : 'var(--line)'}`,
                        }}
                      >
                        <Shield size={10} />
                        {role.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(null)} className="btn btn-ghost">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn btn-orange disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* ==================== MODAL RESETAR SENHA ==================== */}
      {showModal === 'password' && editingUser && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-sm rounded-[20px] bg-white p-7"
            style={{ border: '1px solid var(--line)' }}
          >
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="min-w-0">
                <div className="mono text-[10px] tracking-[0.14em]" style={{ color: 'var(--ink-50)' }}>
                  SEGURANÇA
                </div>
                <h2 className="display mt-1" style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
                  Resetar Senha
                </h2>
                <p className="mono text-[11px] mt-1 truncate" style={{ color: 'var(--ink-50)' }}>{editingUser.email}</p>
              </div>
              <button
                onClick={() => setShowModal(null)}
                className="rounded p-1.5 transition-colors hover:bg-[var(--paper-2)] shrink-0"
                style={{ color: 'var(--ink-50)' }}
              >
                <X size={20} />
              </button>
            </div>

            {error && <div className="mb-4 rounded-xl p-3 text-sm" style={{ background: '#fee2e2', color: '#991b1b' }}>{error}</div>}
            {success && <div className="mb-4 rounded-xl p-3 text-sm" style={{ background: 'rgba(166,206,58,0.18)', color: '#3d5a0a' }}>{success}</div>}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="mono block text-[10px] tracking-[0.1em] mb-2" style={{ color: 'var(--ink-50)' }}>NOVA SENHA *</label>
                <PasswordInput
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ new_password: e.target.value })}
                  required
                  minLength={6}
                  className="admin-input w-full pl-4 pr-11 py-3 rounded-xl text-sm bg-white focus:outline-none transition-colors"
                  style={{ border: '1px solid var(--line)', color: 'var(--ink)' }}
                />
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(null)} className="btn btn-ghost">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn btn-orange disabled:opacity-50">
                  {saving ? 'Alterando...' : 'Alterar Senha'}
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
