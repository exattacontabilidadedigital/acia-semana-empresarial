import type { createAdminClient } from '@/lib/supabase/admin'

type SupabaseAdmin = ReturnType<typeof createAdminClient>

interface InscriptionRow {
  id: number
  order_number: string | null
  nome: string
  email: string
  event_id: number
  quantity: number | null
  payment_id: string | null
  payment_url?: string | null
  asaas_customer_id?: string | null
}

/**
 * Confirma uma inscription pendente de forma atômica e cria os tickets correspondentes.
 *
 * Idempotência: o UPDATE filtra por `payment_status = 'pending'` — se duas chamadas
 * concorrentes (ex.: webhook duplicado + polling) tentarem confirmar a mesma inscription,
 * apenas uma vai retornar a row no `.select()`. Tickets só são criados pela chamada que
 * efetivamente fez a transição pending → confirmed, garantindo que não há duplicação.
 *
 * @returns `true` se esta chamada confirmou a inscription agora; `false` se já estava
 *          confirmada por outra chamada (não cria tickets nem dispara e-mail).
 */
export async function confirmInscriptionAtomic(
  supabase: SupabaseAdmin,
  inscription: InscriptionRow,
  patch: Partial<{
    payment_id: string
    payment_url: string | null
    asaas_customer_id: string
  }> = {},
): Promise<boolean> {
  const { data: updated, error: updateError } = await supabase
    .from('inscriptions')
    .update({ payment_status: 'confirmed', ...patch })
    .eq('id', inscription.id)
    .eq('payment_status', 'pending')
    .select('id')

  if (updateError) {
    console.error(`[CONFIRM] Erro ao atualizar inscription ${inscription.id}:`, updateError)
    return false
  }

  // Sem row retornada = inscription não estava em pending (já foi processada por outra chamada)
  if (!updated || updated.length === 0) {
    return false
  }

  const ticketCount = inscription.quantity || 1
  const tickets = Array.from({ length: ticketCount }, () => ({
    inscription_id: inscription.id,
    event_id: inscription.event_id,
    participant_name: inscription.nome,
    status: 'active',
  }))

  const { error: ticketError } = await supabase.from('tickets').insert(tickets)
  if (ticketError) {
    console.error(`[CONFIRM] Erro ao criar tickets para ${inscription.id}:`, ticketError)
  }

  // Email assíncrono — não bloqueia
  if (inscription.order_number) {
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email/confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_number: inscription.order_number }),
    }).catch((e) => console.error('[CONFIRM] Erro ao disparar email:', e))
  }

  console.log(
    `[CONFIRM] Inscrição ${inscription.order_number} confirmada — ${ticketCount} ticket(s) criado(s)`,
  )

  return true
}
