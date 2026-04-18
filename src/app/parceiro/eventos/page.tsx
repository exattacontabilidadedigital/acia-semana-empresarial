import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatDateShort } from '@/lib/utils'

export default async function ParceiroEventosPage() {
  const supabase = createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch events owned by this user
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('owner_id', user.id)
    .order('event_date', { ascending: false })

  // Fetch inscription counts per event
  const eventIds = events?.map((e) => e.id) ?? []
  let inscriptionCounts: Record<number, number> = {}

  if (eventIds.length > 0) {
    const { data: inscriptions } = await supabase
      .from('inscriptions')
      .select('event_id')
      .in('event_id', eventIds)

    if (inscriptions) {
      for (const insc of inscriptions) {
        inscriptionCounts[insc.event_id] = (inscriptionCounts[insc.event_id] ?? 0) + 1
      }
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Meus Eventos</h1>
        <p className="text-gray-500 mt-1">Gerencie os eventos da sua organização</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {!events || events.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            Nenhum evento encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Título</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Categoria</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Data</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Vagas</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Inscrições</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const count = inscriptionCounts[event.id] ?? 0
                  return (
                    <tr key={event.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{event.title}</td>
                      <td className="px-6 py-4 text-gray-600">{event.category}</td>
                      <td className="px-6 py-4 text-gray-600">{formatDateShort(event.event_date)}</td>
                      <td className="px-6 py-4 text-gray-600">{event.capacity}</td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-purple-700">{count}</span>
                        <span className="text-gray-400">/{event.capacity}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            event.status === 'active' || event.status === 'published'
                              ? 'bg-green-100 text-green-700'
                              : event.status === 'sold_out'
                              ? 'bg-orange-100 text-orange-700'
                              : event.status === 'closed' || event.status === 'finished'
                              ? 'bg-red-100 text-red-700'
                              : event.status === 'draft'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {event.status === 'active' || event.status === 'published' ? 'Ativo'
                            : event.status === 'sold_out' ? 'Esgotado'
                            : event.status === 'closed' || event.status === 'finished' ? 'Encerrado'
                            : event.status === 'draft' ? 'Rascunho'
                            : event.status === 'cancelled' ? 'Cancelado'
                            : event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/parceiro/inscricoes?evento=${event.id}`}
                          className="text-purple-600 hover:text-purple-800 font-medium text-sm"
                        >
                          Ver Inscrições
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
