import * as QRCode from 'qrcode'

/**
 * Gera QR code como data URL (base64).
 */
export async function generateAndUploadQRCode(
  identifier: string,
  type: 'order' | 'group' = 'order'
): Promise<string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const ticketUrl = `${siteUrl}/checkin/${identifier}`

  const dataUrl = await QRCode.toDataURL(ticketUrl, { width: 400, margin: 2 })
  console.log('[QRCODE] Gerado para:', identifier)
  return dataUrl
}
