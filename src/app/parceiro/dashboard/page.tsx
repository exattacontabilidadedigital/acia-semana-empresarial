import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatDateShort, formatCPF } from '@/lib/utils'

export default async function ParceiroDashboardPage() {
  const supabase = createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get partner record
  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!partner) redirect('/login')

  // Fetch events owned by this user
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('owner_id', user.id)

  const eventIds = events?.map((e) => e.id) ?? []
  const totalEvents = events?.length ?? 0

  // Fetch inscriptions for partner's events
  let totalInscriptions = 0
  let totalCheckins = 0
  let recentInscriptions: any[] = []

  if (eventIds.length > 0) {
    const { data: inscriptions } = await supabase
      .from('inscriptions')
      .select('*')
      .in('event_id', eventIds)

    totalInscriptions = inscriptions?.length ?? 0

    // Count check-ins via tickets
    const { count: checkinCount } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .in('event_id', eventIds)
      .not('checked_in_at', 'is', null)

    totalCheckins = checkinCount ?? 0

    // Recent inscriptions (last 10)
    const { data: recent } = await supabase
      .from('inscriptions')
      .select('*, events(title)')
      .in('event_id', eventIds)
      .order('created_at', { ascending: false })
      .limit(10)

    recentInscriptions = recent ?? []
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Bem-vindo, {partner.organization_name}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Total de Eventos</p>
          <p className="text-3xl font-bold text-purple-700 mt-2">{totalEvents}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Total de Inscrições</p>
          <p className="text-3xl font-bold text-purple-700 mt-2">{totalInscriptions}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Check-ins Realizados</p>
          <p className="text-3xl font-bold text-purple-700 mt-2">{totalCheckins}</p>
        </div>
      </div>

      {/* Recent Inscriptions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Inscrições Recentes</h2>
        </div>
        {recentInscriptions.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            Nenhuma inscrição encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Nome</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Email</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Evento</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Data</th>
                </tr>
              </thead>
              <tbody>
                {recentInscriptions.map((insc: any) => (
                  <tr key={insc.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{insc.nome}</td>
                    <td className="px-6 py-3 text-gray-600">{insc.email}</td>
                    <td className="px-6 py-3 text-gray-600">{insc.events?.title ?? '-'}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          insc.payment_status === 'CONFIRMED' || insc.payment_status === 'RECEIVED'
                            ? 'bg-green-100 text-green-700'
                            : insc.payment_status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {insc.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-500">{formatDateShort(insc.created_at)}</td>
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
