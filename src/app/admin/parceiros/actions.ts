'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createInvitation } from '@/lib/invitations'
import { slugify } from '@/lib/orgs'

export async function createOrganizationAction(formData: FormData) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/admin/parceiros')

  const name = String(formData.get('name') ?? '').trim()
  const type = String(formData.get('type') ?? '').trim()
  const cnpj = String(formData.get('cnpj') ?? '').trim() || null
  const email = String(formData.get('email') ?? '').trim().toLowerCase() || null
  const phone = String(formData.get('phone') ?? '').trim() || null
  const website = String(formData.get('website') ?? '').trim() || null
  const description = String(formData.get('description') ?? '').trim() || null
  const ownerEmail = String(formData.get('owner_email') ?? '').trim().toLowerCase()

  if (!name || !type || !ownerEmail) {
    redirect(
      `/admin/parceiros?error=${encodeURIComponent(
        'Nome, tipo e email do owner são obrigatórios.'
      )}`
    )
  }

  const admin = createAdminClient()

  // Slug único
  let slug = slugify(name)
  let suffix = 0
  while (true) {
    const { data: exists } = await admin
      .from('organizations')
      .select('id')
      .eq('slug', suffix === 0 ? slug : `${slug}-${suffix}`)
      .maybeSingle()
    if (!exists) {
      if (suffix > 0) slug = `${slug}-${suffix}`
      break
    }
    suffix += 1
  }

  const { data: created, error: orgErr } = await admin
    .from('organizations')
    .insert({
      name,
      slug,
      type,
      cnpj,
      email,
      phone,
      website,
      description,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (orgErr || !created) {
    redirect(
      `/admin/parceiros?error=${encodeURIComponent(
        orgErr?.message ?? 'Falha ao criar organização.'
      )}`
    )
  }

  const inviteResult = await createInvitation({
    organizationId: created.id,
    email: ownerEmail,
    role: 'owner',
    invitedBy: user.id,
  })

  if (inviteResult.error) {
    redirect(
      `/admin/parceiros/${created.id}?warn=${encodeURIComponent(inviteResult.error)}`
    )
  }

  revalidatePath('/admin/parceiros')
  redirect(`/admin/parceiros/${created.id}?invited=1`)
}
