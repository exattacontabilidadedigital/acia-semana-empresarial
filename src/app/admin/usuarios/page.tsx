'use client'

import { useEffect, useState } from 'react'
import {
  UserPlus,
  UserCog,
  X,
  Loader2,
  Shield,
  Mail,
  Phone,
  User,
  Key,
  Pencil,
  CheckCircle,
  XCircle,
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
        <Loader2 className="animate-spin text-purple" size={32} />
      </div>
    )
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-red-100 text-red-800',
    organizer: 'bg-purple-100 text-purple-800',
    partner: 'bg-blue-100 text-blue-800',
  }

  const totalUsers = users.length
  const admins = users.filter((u) => u.roles.includes('admin')).length
  const partners = users.filter((u) => u.roles.includes('partner')).length
  const noRole = users.filter((u) => u.roles.length === 0).length

  return (
    <div>
      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
            </div>
            <div className="rounded-lg p-2.5 bg-purple/10"><UserCog size={20} className="text-purple" /></div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-red-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Admins</p>
              <p className="text-2xl font-bold text-gray-900">{admins}</p>
            </div>
            <div className="rounded-lg p-2.5 bg-red-50"><Shield size={20} className="text-red-500" /></div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-blue-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Parceiros</p>
              <p className="text-2xl font-bold text-gray-900">{partners}</p>
            </div>
            <div className="rounded-lg p-2.5 bg-blue-50"><User size={20} className="text-blue-500" /></div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm border-l-4 border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Sem Role</p>
              <p className="text-2xl font-bold text-gray-900">{noRole}</p>
            </div>
            <div className="rounded-lg p-2.5 bg-gray-100"><Clock size={20} className="text-gray-400" /></div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 font-montserrat">Usuários</h1>
        <button
          onClick={() => {
            setCreateForm({ email: '', password: '', full_name: '', phone: '', role_ids: [] })
            setError('')
            setSuccess('')
            setShowModal('create')
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-purple px-4 py-2 text-sm font-medium text-white hover:bg-purple-dark"
        >
          <UserPlus size={18} />
          Novo Usuário
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="px-6 py-3 font-medium">Nome</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Telefone</th>
                <th className="px-6 py-3 font-medium">Roles</th>
                <th className="px-6 py-3 font-medium">Criado em</th>
                <th className="px-6 py-3 font-medium">Último login</th>
                <th className="px-6 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id} className="text-gray-700 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium">{user.full_name || '—'}</td>
                  <td className="px-6 py-3">{user.email}</td>
                  <td className="px-6 py-3">{user.phone || '—'}</td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length > 0 ? user.roles.map((role) => (
                        <span
                          key={role}
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            roleColors[role] ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {role}
                        </span>
                      )) : (
                        <span className="text-xs text-gray-400">Sem role</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-xs">{formatDate(user.created_at)}</td>
                  <td className="px-6 py-3 text-xs">
                    {user.last_sign_in ? formatDate(user.last_sign_in) : '—'}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(user)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-purple"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => openPassword(user)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-orange"
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
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== MODAL CRIAR ==================== */}
      {showModal === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Novo Usuário</h2>
              <button onClick={() => setShowModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            {success && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-600">{success}</div>}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Senha *</label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                    required
                    minLength={6}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nome completo</label>
                  <input
                    type="text"
                    value={createForm.full_name}
                    onChange={(e) => setCreateForm((p) => ({ ...p, full_name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Telefone</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Roles</label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleRole(role.id, 'create')}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                        createForm.role_ids.includes(role.id)
                          ? 'border-purple bg-purple/10 text-purple'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <Shield size={10} className="inline mr-1" />
                      {role.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-purple px-4 py-2 text-sm font-medium text-white hover:bg-purple-dark disabled:opacity-50">
                  {saving ? 'Criando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL EDITAR ==================== */}
      {showModal === 'edit' && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Editar Usuário</h2>
                <p className="text-xs text-gray-500">{editingUser.email}</p>
              </div>
              <button onClick={() => setShowModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            {success && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-600">{success}</div>}

            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nome completo</label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Telefone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Roles</label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleRole(role.id, 'edit')}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                        editForm.role_ids.includes(role.id)
                          ? 'border-purple bg-purple/10 text-purple'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <Shield size={10} className="inline mr-1" />
                      {role.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-purple px-4 py-2 text-sm font-medium text-white hover:bg-purple-dark disabled:opacity-50">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL RESETAR SENHA ==================== */}
      {showModal === 'password' && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Resetar Senha</h2>
                <p className="text-xs text-gray-500">{editingUser.email}</p>
              </div>
              <button onClick={() => setShowModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            {success && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-600">{success}</div>}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nova Senha *</label>
                <input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ new_password: e.target.value })}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-orange px-4 py-2 text-sm font-medium text-white hover:bg-orange-dark disabled:opacity-50">
                  {saving ? 'Alterando...' : 'Alterar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
