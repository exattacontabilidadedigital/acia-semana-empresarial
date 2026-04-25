'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { invalidateSmtpCache, sendEmail, verifySmtpConnection } from '@/lib/email'
import { deleteCertificatePdf } from '@/lib/certificates'

async function requireAdmin(redirectTo: string) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=${redirectTo}`)
  return user!
}

// ============================================
// TEMPLATE: salvar (cria ou atualiza)
// ============================================
export async function saveCertificateTemplateAction(formData: FormData) {
  await requireAdmin('/admin/certificados/template')

  const id = formData.get('id') ? Number(formData.get('id')) : null
  const eventIdRaw = String(formData.get('event_id') ?? '').trim()
  const eventId = eventIdRaw && eventIdRaw !== '0' ? Number(eventIdRaw) : null
  const signatureIdsRaw = formData.getAll('signature_ids')

  const patch: Record<string, any> = {
    name: String(formData.get('name') ?? '').trim() || 'Template',
    header_text: String(formData.get('header_text') ?? '').trim() || 'Certificado de Participação',
    body_text: String(formData.get('body_text') ?? '').trim(),
    footer_text: String(formData.get('footer_text') ?? '').trim() || null,
    logo_url: String(formData.get('logo_url') ?? '').trim() || null,
    background_url: String(formData.get('background_url') ?? '').trim() || null,
    duration_hours: formData.get('duration_hours')
      ? Number(formData.get('duration_hours'))
      : null,
    event_id: eventId,
  }

  const admin = createAdminClient()
  let templateId = id

  if (id) {
    await admin.from('certificate_templates').update(patch).eq('id', id)
  } else {
    const { data } = await admin
      .from('certificate_templates')
      .insert(patch)
      .select('id')
      .single()
    templateId = data?.id ?? null
  }

  // Atualiza vínculos de assinatura (deleta tudo e re-insere)
  if (templateId) {
    await admin
      .from('certificate_template_signatures')
      .delete()
      .eq('template_id', templateId)
    const sigIds = signatureIdsRaw
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n))
    if (sigIds.length > 0) {
      await admin.from('certificate_template_signatures').insert(
        sigIds.map((sid, idx) => ({
          template_id: templateId,
          signature_id: sid,
          display_order: idx,
        }))
      )
    }
  }

  revalidatePath('/admin/certificados')
  revalidatePath('/admin/certificados/template')
  if (templateId) {
    revalidatePath(`/admin/certificados/template/${templateId}`)
    redirect(`/admin/certificados/template/${templateId}?saved=1`)
  }
  redirect('/admin/certificados/template')
}

export async function deleteCertificateTemplateAction(formData: FormData) {
  await requireAdmin('/admin/certificados/template')
  const id = Number(formData.get('id'))
  const admin = createAdminClient()
  await admin.from('certificate_templates').delete().eq('id', id)
  revalidatePath('/admin/certificados/template')
  redirect('/admin/certificados/template')
}

// ============================================
// ASSINATURAS: CRUD
// ============================================
export async function saveSignatureAction(formData: FormData) {
  const user = await requireAdmin('/admin/configuracoes/assinaturas')

  const id = formData.get('id') ? Number(formData.get('id')) : null
  const validSizes = ['small', 'medium', 'large', 'xlarge']
  const sizeRaw = String(formData.get('image_size') ?? '').trim()
  const imageSize = validSizes.includes(sizeRaw) ? sizeRaw : 'medium'

  const patch: Record<string, any> = {
    name: String(formData.get('name') ?? '').trim(),
    role: String(formData.get('role') ?? '').trim() || null,
    organization: String(formData.get('organization') ?? '').trim() || null,
    signature_image_url: String(formData.get('signature_image_url') ?? '').trim() || null,
    organization_logo_url: String(formData.get('organization_logo_url') ?? '').trim() || null,
    image_size: imageSize,
    display_order: formData.get('display_order')
      ? Number(formData.get('display_order'))
      : 0,
    active: formData.get('active') === 'on',
  }

  if (!patch.name) {
    redirect('/admin/configuracoes/assinaturas?error=Nome%20obrigatório')
  }

  const admin = createAdminClient()
  if (id) {
    await admin.from('certificate_signatures').update(patch).eq('id', id)
  } else {
    await admin.from('certificate_signatures').insert({
      ...patch,
      created_by: user.id,
    })
  }

  revalidatePath('/admin/configuracoes/assinaturas')
  revalidatePath('/admin/certificados/template')
  redirect('/admin/configuracoes/assinaturas?saved=1')
}

export async function deleteSignatureAction(formData: FormData) {
  await requireAdmin('/admin/configuracoes/assinaturas')
  const id = Number(formData.get('id'))
  const admin = createAdminClient()
  await admin.from('certificate_signatures').delete().eq('id', id)
  revalidatePath('/admin/configuracoes/assinaturas')
}

async function uploadCertificateAssetGeneric(
  formData: FormData,
  folder: 'signatures' | 'backgrounds' | 'logos',
  maxBytes = 3 * 1024 * 1024
): Promise<{ url: string | null; error?: string }> {
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { url: null, error: 'Nenhum arquivo enviado.' }
  }

  const allowed = ['image/png', 'image/jpeg', 'image/webp']
  if (!allowed.includes(file.type)) {
    return { url: null, error: 'Use PNG, JPG ou WebP.' }
  }

  if (file.size > maxBytes) {
    return {
      url: null,
      error: `Arquivo > ${Math.round(maxBytes / 1024 / 1024)}MB.`,
    }
  }

  const admin = createAdminClient()
  const ext = (file.name.split('.').pop() || 'png').toLowerCase()
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await admin.storage
    .from('certificate-assets')
    .upload(path, file, { contentType: file.type })
  if (error) return { url: null, error: error.message }
  return {
    url: admin.storage.from('certificate-assets').getPublicUrl(path).data.publicUrl,
  }
}

export async function uploadSignatureAssetAction(
  formData: FormData
): Promise<{ url: string | null; error?: string }> {
  await requireAdmin('/admin/configuracoes/assinaturas')
  return uploadCertificateAssetGeneric(formData, 'signatures', 3 * 1024 * 1024)
}

export async function uploadTemplateBackgroundAction(
  formData: FormData
): Promise<{ url: string | null; error?: string }> {
  await requireAdmin('/admin/certificados/template')
  // Background pode ser maior (arte completa) — até 8MB.
  return uploadCertificateAssetGeneric(formData, 'backgrounds', 8 * 1024 * 1024)
}

export async function uploadTemplateLogoAction(
  formData: FormData
): Promise<{ url: string | null; error?: string }> {
  await requireAdmin('/admin/certificados/template')
  return uploadCertificateAssetGeneric(formData, 'logos', 3 * 1024 * 1024)
}

// ============================================
// SMTP CONFIG
// ============================================
export async function saveSmtpConfigAction(formData: FormData) {
  const user = await requireAdmin('/admin/configuracoes/smtp')

  const port = Number(formData.get('port')) || 587
  const patch = {
    id: 1,
    host: String(formData.get('host') ?? '').trim(),
    port,
    secure: port === 465,
    username: String(formData.get('username') ?? '').trim(),
    password: String(formData.get('password') ?? '').trim(),
    from_email: String(formData.get('from_email') ?? '').trim() || null,
    from_name: String(formData.get('from_name') ?? '').trim() || null,
    enabled: formData.get('enabled') === 'on',
    updated_by: user.id,
  }

  if (!patch.host || !patch.username || !patch.password) {
    redirect(
      '/admin/configuracoes/smtp?error=' +
        encodeURIComponent('Preencha host, usuário e senha.')
    )
  }

  const admin = createAdminClient()
  await admin
    .from('smtp_config')
    .upsert(patch, { onConflict: 'id' })

  invalidateSmtpCache()
  revalidatePath('/admin/configuracoes/smtp')
  redirect('/admin/configuracoes/smtp?saved=1')
}

export async function testSmtpAction(formData: FormData) {
  const user = await requireAdmin('/admin/configuracoes/smtp')
  const to = String(formData.get('to') ?? '').trim()

  if (!to) {
    redirect(
      '/admin/configuracoes/smtp?error=' +
        encodeURIComponent('Informe um email pra teste.')
    )
  }

  invalidateSmtpCache()

  const verify = await verifySmtpConnection()
  if (!verify.ok) {
    const admin = createAdminClient()
    await admin
      .from('smtp_config')
      .update({
        test_email_to: to,
        test_sent_at: new Date().toISOString(),
        test_last_error: verify.error ?? 'erro desconhecido',
      })
      .eq('id', 1)
    redirect(
      '/admin/configuracoes/smtp?error=' +
        encodeURIComponent('Conexão falhou: ' + (verify.error ?? ''))
    )
  }

  const send = await sendEmail({
    to,
    subject: '[Teste] Configuração SMTP — Semana Empresarial',
    html: `
      <div style="font-family:system-ui;padding:24px">
        <h2>Configuração SMTP funcionando</h2>
        <p>Este é um email de teste enviado em ${new Date().toLocaleString('pt-BR')}.</p>
        <p style="color:#666;font-size:13px">
          Se você recebeu este email, sua configuração de SMTP está correta
          e mensagens automáticas (lembretes, certificados) serão enviadas
          com sucesso.
        </p>
      </div>
    `,
  })

  const admin = createAdminClient()
  await admin
    .from('smtp_config')
    .update({
      test_email_to: to,
      test_sent_at: new Date().toISOString(),
      test_last_error: send.success ? null : (send as any).reason ?? 'falhou',
    })
    .eq('id', 1)

  if (!send.success) {
    redirect(
      '/admin/configuracoes/smtp?error=' +
        encodeURIComponent('Envio falhou: ' + ((send as any).reason ?? ''))
    )
  }

  redirect('/admin/configuracoes/smtp?test_sent=1')
}
