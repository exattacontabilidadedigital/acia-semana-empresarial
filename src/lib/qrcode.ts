import * as QRCode from 'qrcode'

/**
 * Gera QR code como data URL (base64).
 * Para checkin por participante dentro de um grupo, passe `participantCpf`.
 */
export async function generateAndUploadQRCode(
  identifier: string,
  type: 'order' | 'group' | 'participant' = 'order',
  participantCpf?: string
): Promise<string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const baseUrl = `${siteUrl}/checkin/${identifier}`
  const ticketUrl = participantCpf ? `${baseUrl}?p=${participantCpf}` : baseUrl

  const dataUrl = await QRCode.toDataURL(ticketUrl, { width: 400, margin: 2 })
  console.log('[QRCODE] Gerado para:', identifier, type, participantCpf ?? '')
  return dataUrl
}
