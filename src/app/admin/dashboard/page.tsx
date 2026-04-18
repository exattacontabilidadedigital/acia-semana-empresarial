import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import {
  Calendar,
  Users,
  DollarSign,
  CheckCircle,
  Ticket,
  Tag,
  Clock,
  TrendingUp,
  AlertCircle,
  ShoppingCart,
  AlertTriangle,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const supabase = createServerSupabaseClient()

  // Calculate date boundaries
  const now = new Date()
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(now.getDate() + 7)
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(now.getDate() - 3)

  const nowISO = now.toISOString()
  const sevenDaysISO = sevenDaysFromNow.toISOString().split('T')[0]
  const todayDate = now.toISOString().split('T')[0]
  const threeDaysAgoISO = threeDaysAgo.toISOString()

  const [
    { count: totalEvents },
    { count: activeEvents },
    { count: totalInscriptions },
    { count: confirmedInscriptions },
    { count: pendingInscriptions },
    { count: freeInscriptions },
    { data: revenueData },
    { count: totalCheckins },
    { count: totalTickets },
    { count: totalCoupons },
    { count: activeCoupons },
    { count: totalGroups },
    { data: recentInscriptions },
    { data: upcomingEvents },
    { count: expiredPendingCount },
  ] = await Promise.all([
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('inscriptions').select('*', { count: 'exact', head: true }),
    supabase
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .in('payment_status', ['confirmed', 'free']),
    supabase
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'pending'),
    supabase
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'free'),
    supabase
      .from('inscriptions')
      .select('net_amount')
      .eq('payment_status', 'confirmed'),
    supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .not('checked_in_at', 'is', null),
    supabase.from('tickets').select('*', { count: 'exact', head: true }),
    supabase.from('coupons').select('*', { count: 'exact', head: true }),
    supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase
      .from('inscriptions')
      .select('purchase_group', { count: 'exact', head: true })
      .not('purchase_group', 'is', null),
    supabase
      .from('inscriptions')
      .select('id, nome, email, total_amount, payment_status, created_at, events(title)')
      .order('created_at', { ascending: false })
      .limit(10),
    // Upcoming events in next 7 days with inscription counts
    supabase
      .from('events')
      .select('id, title, event_date, start_time, capacity')
      .gte('event_date', todayDate)
      .lte('event_date', sevenDaysISO)
      .eq('status', 'active')
      .order('event_date', { ascending: true }),
    // Expired pending payments (older than 3 days)
    supabase
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'pending')
      .lt('created_at', threeDaysAgoISO),
  ])

  const totalRevenue = revenueData?.reduce((sum, row) => sum + (row.net_amount || 0), 0) ?? 0
  const checkinRate = (totalTickets ?? 0) > 0
    ? Math.round(((totalCheckins ?? 0) / (totalTickets ?? 1)) * 100)
    : 0

  // Fetch inscription counts for upcoming events
  let upcomingEventsWithCounts: {
    id: number
    title: string
    event_date: string
    start_time: string | null
    capacity: number | null
    inscriptionCount: number
    fillPercentage: number
  }[] = []

  if (upcomingEvents && upcomingEvents.length > 0) {
    const eventIds = upcomingEvents.map((e: any) => e.id)
    const countPromises = eventIds.map((id: number) =>
      supabase
        .from('inscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', id)
        .in('payment_status', ['confirmed', 'free'])
    )
    const countResults = await Promise.all(countPromises)

    upcomingEventsWithCounts = upcomingEvents.map((ev: any, i: number) => {
      const count = countResults[i].count ?? 0
      const capacity = ev.capacity ?? 0
      const fillPercentage = capacity > 0 ? Math.round((count / capacity) * 100) : 0
      return {
        ...ev,
        inscriptionCount: count,
        fillPercentage,
      }
    })
  }

  // Find events almost sold out (>80% capacity filled) from upcoming events
  const almostSoldOut = upcomingEventsWithCounts.filter((ev) => ev.fillPercentage > 80)

  const statusColors: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-800',
    free: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800',
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 font-montserrat">Dashboard</h1>

      {/* Alertas */}
      {(almostSoldOut.length > 0 || (expiredPendingCount ?? 0) > 0) && (
        <div className="mb-6 space-y-3">
          {almostSoldOut.map((ev) => (
            <div key={ev.id} className="flex items-center gap-3 rounded-lg border border-orange/30 bg-orange/5 p-4">
              <AlertTriangle className="text-orange shrink-0" size={20} />
              <div className="text-sm">
                <span className="font-semibold text-gray-900">{ev.title}</span>
                <span className="text-gray-600">
                  {' '}quase esgotado — {ev.inscriptionCount}/{ev.capacity ?? '?'} ({ev.fillPercentage}%)
                </span>
              </div>
            </div>
          ))}
          {(expiredPendingCount ?? 0) > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <div className="text-sm">
                <span className="font-semibold text-red-800">Pagamentos expirados:</span>
                <span className="text-red-700">
                  {' '}{expiredPendingCount} inscrição(ões) pendente(s) há mais de 3 dias
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/eventos" className="group rounded-lg bg-white p-5 shadow-sm border-l-4 border-purple hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Eventos</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{totalEvents ?? 0}</p>
              <p className="text-xs text-green-600 mt-1">{activeEvents ?? 0} ativos</p>
            </div>
            <div className="rounded-lg p-3 bg-purple text-white group-hover:scale-110 transition-transform">
              <Calendar size={24} />
            </div>
          </div>
        </Link>

        <Link href="/admin/inscricoes" className="group rounded-lg bg-white p-5 shadow-sm border-l-4 border-cyan hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Inscrições</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{confirmedInscriptions ?? 0}</p>
              <div className="flex gap-2 mt-1">
                {(pendingInscriptions ?? 0) > 0 && (
                  <span className="text-xs text-yellow-600 flex items-center gap-0.5">
                    <Clock size={10} />
                    {pendingInscriptions} pendentes
                  </span>
                )}
                {(freeInscriptions ?? 0) > 0 && (
                  <span className="text-xs text-blue-600">{freeInscriptions} gratuitas</span>
                )}
              </div>
            </div>
            <div className="rounded-lg p-3 bg-cyan text-white group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
          </div>
        </Link>

        <div className="rounded-lg bg-white p-5 shadow-sm border-l-4 border-orange">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Receita</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-gray-400 mt-1">{totalInscriptions ?? 0} inscrições totais</p>
            </div>
            <div className="rounded-lg p-3 bg-orange text-white">
              <DollarSign size={24} />
            </div>
          </div>
        </div>

        <Link href="/admin/checkin" className="group rounded-lg bg-white p-5 shadow-sm border-l-4 border-green-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Check-ins</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{totalCheckins ?? 0}</p>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${checkinRate}%` }} />
                </div>
                <span className="text-xs text-gray-500">{checkinRate}%</span>
              </div>
            </div>
            <div className="rounded-lg p-3 bg-green-500 text-white group-hover:scale-110 transition-transform">
              <CheckCircle size={24} />
            </div>
          </div>
        </Link>
      </div>

      {/* Secondary Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Link href="/admin/cupons" className="group flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="rounded-lg p-2.5 bg-pink-100 text-pink-600 group-hover:scale-110 transition-transform">
            <Tag size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{totalCoupons ?? 0} Cupons</p>
            <p className="text-xs text-gray-500">{activeCoupons ?? 0} ativos</p>
          </div>
        </Link>

        <div className="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm">
          <div className="rounded-lg p-2.5 bg-indigo-100 text-indigo-600">
            <Ticket size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{totalTickets ?? 0} Ingressos</p>
            <p className="text-xs text-gray-500">{(totalTickets ?? 0) - (totalCheckins ?? 0)} não utilizados</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm">
          <div className="rounded-lg p-2.5 bg-amber-100 text-amber-600">
            <ShoppingCart size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{totalGroups ?? 0} Compras</p>
            <p className="text-xs text-gray-500">via carrinho</p>
          </div>
        </div>
      </div>

      {/* Próximos Eventos */}
      {upcomingEventsWithCounts.length > 0 && (
        <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Próximos Eventos</h2>
            <Link href="/admin/eventos" className="text-xs text-purple font-medium hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingEventsWithCounts.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-4 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple/10 p-2">
                    <Calendar className="text-purple" size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{ev.title}</p>
                    <p className="text-xs text-gray-500">
                      {formatDateShort(ev.event_date)}
                      {ev.start_time ? ` às ${ev.start_time.slice(0, 5)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {ev.inscriptionCount}/{ev.capacity ?? '?'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          ev.fillPercentage > 80 ? 'bg-orange' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(ev.fillPercentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{ev.fillPercentage}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Inscriptions */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Inscrições Recentes</h2>
          <Link href="/admin/inscricoes" className="text-xs text-purple font-medium hover:underline">
            Ver todas
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="pb-3 font-medium">Nome</th>
                <th className="pb-3 font-medium">Evento</th>
                <th className="pb-3 font-medium">Valor</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentInscriptions?.map((insc: any) => (
                <tr key={insc.id} className="text-gray-700">
                  <td className="py-3">{insc.nome}</td>
                  <td className="py-3">{insc.events?.title ?? '—'}</td>
                  <td className="py-3">{formatCurrency(insc.total_amount)}</td>
                  <td className="py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusColors[insc.payment_status] ?? 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {insc.payment_status}
                    </span>
                  </td>
                  <td className="py-3">{formatDateShort(insc.created_at)}</td>
                </tr>
              ))}
              {(!recentInscriptions || recentInscriptions.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">
                    Nenhuma inscrição encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
