export const dynamic = 'force-dynamic'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { formatDateShort, formatCurrency } from '@/lib/utils'
import type { Event } from '@/types/database'
import RelatoriosClient from './RelatoriosClient'

export default async function AdminRelatoriosPage({
  searchParams,
}: {
  searchParams: { evento?: string }
}) {
  const supabase = createServerSupabaseClient()

  // Fetch events for dropdown (with more data for overview)
  const { data: events } = await supabase
    .from('events')
    .select('id, title, capacity, price, event_date, status')
    .order('event_date', { ascending: false })

  const selectedEventId = searchParams.evento ? Number(searchParams.evento) : null

  // Global overview data
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  const [
    { count: globalTotal },
    { count: globalConfirmed },
    { count: globalPending },
    { count: globalFree },
    { data: globalRevenueData },
    { count: globalCheckins },
    { count: globalTickets },
    { count: globalExpired },
    { data: allInscriptionsByEvent },
  ] = await Promise.all([
    supabase.from('inscriptions').select('*', { count: 'exact', head: true }),
    supabase.from('inscriptions').select('*', { count: 'exact', head: true }).eq('payment_status', 'confirmed'),
    supabase.from('inscriptions').select('*', { count: 'exact', head: true }).eq('payment_status', 'pending'),
    supabase.from('inscriptions').select('*', { count: 'exact', head: true }).eq('payment_status', 'free'),
    supabase.from('inscriptions').select('net_amount').eq('payment_status', 'confirmed'),
    supabase.from('tickets').select('*', { count: 'exact', head: true }).not('checked_in_at', 'is', null),
    supabase.from('tickets').select('*', { count: 'exact', head: true }),
    supabase.from('inscriptions').select('*', { count: 'exact', head: true }).eq('payment_status', 'pending').lt('created_at', threeDaysAgo.toISOString()),
    supabase.from('inscriptions').select('event_id, quantity, total_amount, payment_status').in('payment_status', ['confirmed', 'free']),
  ])

  const globalRevenue = globalRevenueData?.reduce((sum, r) => sum + (r.net_amount || 0), 0) ?? 0

  // Build per-event stats for ranking
  const eventStatsMap: Record<number, { inscritos: number; receita: number }> = {}
  for (const insc of allInscriptionsByEvent ?? []) {
    const eid = insc.event_id as number
    if (!eventStatsMap[eid]) eventStatsMap[eid] = { inscritos: 0, receita: 0 }
    eventStatsMap[eid].inscritos += (insc.quantity as number) || 1
    eventStatsMap[eid].receita += (insc.total_amount as number) || 0
  }

  const eventRanking = (events ?? [])
    .map((ev: any) => ({
      ...ev,
      inscritos: eventStatsMap[ev.id]?.inscritos ?? 0,
      receita: eventStatsMap[ev.id]?.receita ?? 0,
      ocupacao: ev.capacity > 0 ? Math.round(((eventStatsMap[ev.id]?.inscritos ?? 0) / ev.capacity) * 100) : 0,
    }))
    .sort((a: any, b: any) => b.inscritos - a.inscritos)

  const globalOverview = {
    total: globalTotal ?? 0,
    confirmed: globalConfirmed ?? 0,
    pending: globalPending ?? 0,
    free: globalFree ?? 0,
    revenue: globalRevenue,
    checkins: globalCheckins ?? 0,
    tickets: globalTickets ?? 0,
    expired: globalExpired ?? 0,
    checkinRate: (globalTickets ?? 0) > 0 ? Math.round(((globalCheckins ?? 0) / (globalTickets ?? 1)) * 100) : 0,
  }

  let stats = {
    totalInscriptions: 0,
    confirmed: 0,
    checkedIn: 0,
    percentage: 0,
  }

  let financials = {
    confirmedRevenue: 0,
    pendingRevenue: 0,
    freeCount: 0,
    halfPriceCount: 0,
    fullPriceCount: 0,
    expiredPendingCount: 0,
  }

  let couponUsage: { code: string; discount_type: string; discount_value: number; times_used: number }[] = []

  let participants: any[] = []

  if (selectedEventId) {
    // Calculate 3 days ago for expired pending
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const threeDaysAgoISO = threeDaysAgo.toISOString()

    const [
      { count: totalInscriptions },
      { count: confirmed },
      { count: checkedIn },
      { data: participantData },
      { data: confirmedRevenueData },
      { data: pendingRevenueData },
      { count: freeCount },
      { count: halfPriceCount },
      { count: fullPriceCount },
      { count: expiredPendingCount },
      { data: couponData },
    ] = await Promise.all([
      supabase
        .from('inscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', selectedEventId),
      supabase
        .from('inscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', selectedEventId)
        .in('payment_status', ['confirmed', 'free']),
      supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', selectedEventId)
        .not('checked_in_at', 'is', null),
      supabase
        .from('tickets')
        .select('id, participant_name, status, checked_in_at, inscriptions(nome, email, cpf)')
        .eq('event_id', selectedEventId)
        .order('participant_name'),
      // Confirmed revenue
      supabase
        .from('inscriptions')
        .select('net_amount')
        .eq('event_id', selectedEventId)
        .eq('payment_status', 'confirmed'),
      // Pending revenue
      supabase
        .from('inscriptions')
        .select('total_amount')
        .eq('event_id', selectedEventId)
        .eq('payment_status', 'pending'),
      // Free inscriptions count
      supabase
        .from('inscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', selectedEventId)
        .eq('payment_status', 'free'),
      // Half-price count
      supabase
        .from('inscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', selectedEventId)
        .eq('is_half_price', true),
      // Full-price count (not half-price and not free)
      supabase
        .from('inscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', selectedEventId)
        .eq('is_half_price', false)
        .neq('payment_status', 'free'),
      // Expired pending (older than 3 days)
      supabase
        .from('inscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', selectedEventId)
        .eq('payment_status', 'pending')
        .lt('created_at', threeDaysAgoISO),
      // Coupon usage for this event
      supabase
        .from('inscriptions')
        .select('coupon_id, coupons(code, discount_type, discount_value)')
        .eq('event_id', selectedEventId)
        .not('coupon_id', 'is', null),
    ])

    const total = totalInscriptions ?? 0
    const checked = checkedIn ?? 0

    stats = {
      totalInscriptions: total,
      confirmed: confirmed ?? 0,
      checkedIn: checked,
      percentage: total > 0 ? Math.round((checked / total) * 100) : 0,
    }

    const confirmedRev = confirmedRevenueData?.reduce((sum, row) => sum + (row.net_amount || 0), 0) ?? 0
    const pendingRev = pendingRevenueData?.reduce((sum, row) => sum + (row.total_amount || 0), 0) ?? 0

    financials = {
      confirmedRevenue: confirmedRev,
      pendingRevenue: pendingRev,
      freeCount: freeCount ?? 0,
      halfPriceCount: halfPriceCount ?? 0,
      fullPriceCount: fullPriceCount ?? 0,
      expiredPendingCount: expiredPendingCount ?? 0,
    }

    // Aggregate coupon usage
    const couponMap = new Map<string, { code: string; discount_type: string; discount_value: number; times_used: number }>()
    if (couponData) {
      for (const row of couponData) {
        const coupon = row.coupons as any
        if (coupon) {
          const key = coupon.code
          if (couponMap.has(key)) {
            couponMap.get(key)!.times_used += 1
          } else {
            couponMap.set(key, {
              code: coupon.code,
              discount_type: coupon.discount_type,
              discount_value: coupon.discount_value,
              times_used: 1,
            })
          }
        }
      }
    }
    couponUsage = Array.from(couponMap.values())

    participants = participantData ?? []
  }

  return (
    <RelatoriosClient
      events={events ?? []}
      selectedEventId={selectedEventId}
      stats={stats}
      financials={financials}
      couponUsage={couponUsage}
      participants={participants}
      globalOverview={globalOverview}
      eventRanking={eventRanking}
    />
  )
}
