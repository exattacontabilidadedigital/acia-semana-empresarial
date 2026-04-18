'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Pagination from '@/components/ui/Pagination'
import { Plus, X, Loader2, Building2 } from 'lucide-react'
import type { Partner } from '@/types/database'

const PAGE_SIZE = 20

type PartnerWithUser = Partner & {
  user_profiles?: { full_name: string | null } | null
}

export default function AdminParceirosPage() {
  const supabase = createClient()
  const [partners, setPartners] = useState<PartnerWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  const [form, setForm] = useState({
    user_email: '',
    organization_name: '',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)

  async function fetchPartners() {
    setLoading(true)
    const { data } = await supabase
      .from('partners')
      .select('*, user_profiles(full_name)')
      .order('created_at', { ascending: false })

    setPartners((data as PartnerWithUser[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchPartners()
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      // Look up user by email from auth (we use a simple approach: query user_profiles is not possible by email,
      // so we search inscriptions or rely on admin knowing the user_id).
      // For now, we'll try to find user via Supabase Admin or a workaround.
      // Simplest: use the email to find existing inscriptions with that email.

      // Actually, we need auth admin to look up by email. Since this is client-side,
      // we'll ask for the user_id or look up via an RPC or just store with a placeholder.
      // For a practical approach, we search the auth users or use an API route.

      // Workaround: try to find a user_profile with a matching inscription email
      const { data: inscriptionMatch } = await supabase
        .from('inscriptions')
        .select('user_id')
        .eq('email', form.user_email)
        .not('user_id', 'is', null)
        .limit(1)
        .single()

      let userId = inscriptionMatch?.user_id

      if (!userId) {
        setError('Nenhum usuário encontrado com este email. O usuário precisa ter se inscrito em pelo menos um evento.')
        setSaving(false)
        return
      }

      let logo_url: string | null = null

      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const path = `partners/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(path, logoFile)
        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from('images').getPublicUrl(path)
        logo_url = urlData.publicUrl
      }

      // Create partner
      const { error: insertError } = await supabase.from('partners').insert({
        user_id: userId,
        organization_name: form.organization_name,
        logo_url,
      })
      if (insertError) throw insertError

      // Assign partner role (role_id = 3 assumed for partner, adjust as needed)
      // First find the partner role
      const { data: partnerRole } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'partner')
        .single()

      if (partnerRole) {
        await supabase.from('users_roles').insert({
          user_id: userId,
          role_id: partnerRole.id,
        })
      }

      setShowForm(false)
      setForm({ user_email: '', organization_name: '' })
      setLogoFile(null)
      fetchPartners()
    } catch (err: any) {
      setError(err.message || 'Erro ao criar parceiro')
    } finally {
      setSaving(false)
    }
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
        <h1 className="text-2xl font-bold text-gray-900 font-montserrat">Parceiros</h1>
        <button
          onClick={() => {
            setShowForm(!showForm)
            setError('')
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-purple px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-dark"
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
          {showForm ? 'Cancelar' : 'Novo Parceiro'}
        </button>
      </div>

      {/* New partner form */}
      {showForm && (
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Cadastrar Parceiro</h2>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email do Usuário</label>
              <input
                type="email"
                name="user_email"
                value={form.user_email}
                onChange={handleChange}
                required
                placeholder="email@exemplo.com"
                className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
              />
              <p className="mt-1 text-xs text-gray-400">
                O usuário precisa já estar cadastrado no sistema.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nome da Organização</label>
              <input
                type="text"
                name="organization_name"
                value={form.organization_name}
                onChange={handleChange}
                required
                className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple focus:outline-none focus:ring-1 focus:ring-purple"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-purple/10 file:px-3 file:py-1 file:text-sm file:text-purple"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-purple px-6 py-2.5 text-sm font-medium text-white hover:bg-purple-dark disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Cadastrar Parceiro'}
            </button>
          </form>
        </div>
      )}

      {/* Partners list */}
      <div className="rounded-lg bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="px-6 py-3 font-medium">Organização</th>
                <th className="px-6 py-3 font-medium">Usuário</th>
                <th className="px-6 py-3 font-medium">Logo</th>
                <th className="px-6 py-3 font-medium">Cadastrado em</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {partners.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((partner) => (
                <tr key={partner.id} className="text-gray-700 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-purple" />
                      {partner.organization_name}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    {partner.user_profiles?.full_name ?? partner.user_id}
                  </td>
                  <td className="px-6 py-3">
                    {partner.logo_url ? (
                      <img
                        src={partner.logo_url}
                        alt={partner.organization_name}
                        className="h-8 w-8 rounded object-contain"
                      />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {new Date(partner.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
              {partners.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    Nenhum parceiro cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={Math.ceil(partners.length / PAGE_SIZE)}
          totalItems={partners.length}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}
