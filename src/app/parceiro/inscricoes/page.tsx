import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCPF, formatDateShort } from '@/lib/utils'

interface PageProps {
  searchParams: { evento?: string; busca?: string }
}

export default async function ParceiroInscricoesPage({ searchParams }: PageProps) {
  const supabase = createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const eventoFilter = searchParams.evento ?? ''
  const busca = searchParams.busca ?? ''

  // Fetch events owned by this user (for filter dropdown)
  const { data: events } = await supabase
    .from('events')
    .select('id, title')
    .eq('owner_id', user.id)
    .order('title')

  const eventIds = events?.map((e) => e.id) ?? []

  let inscriptions: any[] = []

  if (eventIds.length > 0) {
    let query = supabase
      .from('inscriptions')
      .select('*, events(title)')
      .in('event_id', eventIds)
      .order('created_at', { ascending: false })

    // Filter by specific event
    if (eventoFilter) {
      const eventId = parseInt(eventoFilter, 10)
      if (!isNaN(eventId) && eventIds.includes(eventId)) {
        query = query.eq('event_id', eventId)
      }
    }

    const { data } = await query
    inscriptions = data ?? []
  }

  // Client-side-like search filter (applied server-side)
  if (busca) {
    const term = busca.toLowerCase()
    inscriptions = inscriptions.filter(
      (insc: any) =>
        insc.nome.toLowerCase().includes(term) ||
        insc.cpf.includes(term) ||
        insc.email.toLowerCase().includes(term)
    )
  }

  // Fetch check-in status for each inscription
  const inscriptionIds = inscriptions.map((i: any) => i.id)
  let checkinMap: Record<number, boolean> = {}

  if (inscriptionIds.length > 0) {
    const { data: tickets } = await supabase
      .from('tickets')
      .select('inscription_id, checked_in_at')
      .in('inscription_id', inscriptionIds)

    if (tickets) {
      for (const t of tickets) {
        if (t.checked_in_at) {
          checkinMap[t.inscription_id] = true
        }
      }
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Inscrições</h1>
        <p className="text-gray-500 mt-1">Visualize as inscrições dos seus eventos</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <form method="GET" className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <input
              type="text"
              name="busca"
              defaultValue={busca}
              placeholder="Nome, CPF ou email..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
          </div>
          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Evento</label>
            <select
              name="evento"
              defaultValue={eventoFilter}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            >
              <option value="">Todos os eventos</option>
              {events?.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-purple-700 text-white rounded-lg text-sm font-medium hover:bg-purple-800 transition-colors"
          >
            Filtrar
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {inscriptions.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            Nenhuma inscrição encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Nome</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Email</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">CPF</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Evento</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Check-in</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Data</th>
                </tr>
              </thead>
              <tbody>
                {inscriptions.map((insc: any) => (
                  <tr key={insc.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{insc.nome}</td>
                    <td className="px-6 py-3 text-gray-600">{insc.email}</td>
                    <td className="px-6 py-3 text-gray-600">{formatCPF(insc.cpf)}</td>
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
                    <td className="px-6 py-3">
                      {checkinMap[insc.id] ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Realizado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          Pendente
                        </span>
                      )}
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
