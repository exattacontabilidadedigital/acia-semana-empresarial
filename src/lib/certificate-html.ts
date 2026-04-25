// HTML do certificado A4 landscape com placeholders, múltiplas assinaturas e
// QR code de verificação. Gerado em string e renderizado pelo Puppeteer.

export type CertificateSignature = {
  name: string
  role: string | null
  organization: string | null
  signature_image_url: string | null
  organization_logo_url: string | null
  image_size?: 'small' | 'medium' | 'large' | 'xlarge' | null
}

const SIG_SCALE: Record<NonNullable<CertificateSignature['image_size']>, number> = {
  small: 0.7,
  medium: 1.0,
  large: 1.3,
  xlarge: 1.6,
}

export type CertificateTemplateData = {
  header_text: string
  body_text: string
  footer_text: string | null
  logo_url: string | null
  background_url?: string | null
}

export type CertificateRenderInput = {
  participantName: string
  eventTitle: string
  eventDate: string // ISO date "yyyy-mm-dd"
  durationHours: number | null
  verificationCode: string
  qrCodeDataUrl: string // dataURL da imagem do QR
  verificationUrl: string // texto exibido no rodapé
  template: CertificateTemplateData
  signatures: CertificateSignature[]
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDateBr(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  const months = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ]
  const monthName = months[Number(m) - 1] ?? m
  return `${Number(d)} de ${monthName} de ${y}`
}

// Interpola placeholders e ESCAPA o template em HTML, mas insere {evento} já
// envolvido em <strong> com classe pra estilizar via CSS. Importante: o body
// retornado é HTML válido — não pode ser escapado de novo.
function interpolateBodyHtml(
  template: string,
  vars: Record<string, string>
): string {
  // Tokeniza primeiro pra escapar as partes literais do template e inserir
  // os values com HTML específico por placeholder.
  return template.split(/(\{\w+\})/g)
    .map((part) => {
      const m = part.match(/^\{(\w+)\}$/)
      if (!m) return escapeHtml(part)
      const key = m[1]
      const value = vars[key] ?? part
      const safe = escapeHtml(value)
      if (key === 'evento') {
        return `<strong class="hl-evento">${safe}</strong>`
      }
      return safe
    })
    .join('')
}

export function generateCertificateHtml(input: CertificateRenderInput): string {
  const dateStr = formatDateBr(input.eventDate)
  const durationStr =
    input.durationHours != null
      ? `${input.durationHours.toString().replace(/\.?0+$/, '')}`
      : '—'

  const headerHtml = escapeHtml(input.template.header_text)
  // bodyHtml já vem HTML-safe (escape feito por placeholder, com <strong>
  // wrapping no nome do evento).
  const bodyHtml = interpolateBodyHtml(input.template.body_text, {
    nome: input.participantName,
    evento: input.eventTitle,
    data: dateStr,
    duracao: durationStr,
    codigo: input.verificationCode,
  })
  const footerHtml = input.template.footer_text
    ? escapeHtml(input.template.footer_text)
    : ''

  // Detecta se ALGUMA assinatura tem logo de organização. Se sim, todas
  // reservam o mesmo slot vertical (mesmo as que não têm), pra alinhar as
  // linhas e os nomes na mesma altura.
  const anyOrgLogo = input.signatures.some((s) => !!s.organization_logo_url)
  const signaturesHtml = input.signatures
    .map((s) => {
      const scale = SIG_SCALE[s.image_size ?? 'medium']
      const sigSlot = `
        <div class="sig-slot">
          <div class="sig-line"></div>
          ${
            s.signature_image_url
              ? `<img class="sig-image-overlay" src="${escapeHtml(s.signature_image_url)}" alt="" style="transform: translateX(-50%) scale(${scale}); transform-origin: center bottom;" />`
              : ''
          }
        </div>
      `
      const orgLogoSlot = anyOrgLogo
        ? s.organization_logo_url
          ? `<div class="sig-org-logo-slot"><img src="${escapeHtml(s.organization_logo_url)}" alt="" /></div>`
          : '<div class="sig-org-logo-slot"></div>'
        : ''
      return `
        <div class="signature">
          ${orgLogoSlot}
          ${sigSlot}
          <div class="sig-name">${escapeHtml(s.name)}</div>
          <div class="sig-role">${escapeHtml(
            [s.role, s.organization].filter(Boolean).join(' · ')
          )}</div>
        </div>
      `
    })
    .join('')

  const logoHtml = input.template.logo_url
    ? `<img class="logo" src="${escapeHtml(input.template.logo_url)}" alt="" />`
    : ''

  const hasBackground = !!input.template.background_url
  const bgImgHtml = hasBackground
    ? `<img class="bg-image" src="${escapeHtml(
        input.template.background_url!
      )}" alt="" />`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4 landscape; margin: 0; }
  html, body { width: 297mm; height: 210mm; }
  body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: #2b2e8d;
    background: #fafaf7;
    position: relative;
    overflow: hidden;
  }

  /* Imagem de fundo (quando setada): preenche a página inteira */
  .bg-image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
    pointer-events: none;
  }

  /* Borda decorativa dupla — escondidas quando há background */
  .border-outer {
    position: absolute;
    inset: 12mm;
    border: 2px solid #2b2e8d;
    pointer-events: none;
  }
  .border-inner {
    position: absolute;
    inset: 16mm;
    border: 1px solid #2b2e8d;
    pointer-events: none;
  }
  .corner {
    position: absolute;
    width: 30mm;
    height: 30mm;
    border-color: #f8821e;
    pointer-events: none;
  }
  .corner.tl { top: 12mm; left: 12mm; border-top: 4px solid; border-left: 4px solid; }
  .corner.tr { top: 12mm; right: 12mm; border-top: 4px solid; border-right: 4px solid; }
  .corner.bl { bottom: 12mm; left: 12mm; border-bottom: 4px solid; border-left: 4px solid; }
  .corner.br { bottom: 12mm; right: 12mm; border-bottom: 4px solid; border-right: 4px solid; }

  .content {
    position: absolute;
    inset: 22mm 24mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    z-index: 2;
  }

  /* Bloco de texto principal — ocupa o espaço entre topo e assinaturas e
     centraliza seu conteúdo verticalmente. Importante quando tem background
     e logo/cabeçalho são omitidos, pra texto não grudar no topo. */
  .text-block {
    flex: 1;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .logo {
    max-height: 22mm;
    max-width: 40mm;
    object-fit: contain;
    margin-bottom: 4mm;
  }

  .header-text {
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-size: 32pt;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #2b2e8d;
    text-transform: uppercase;
    margin-bottom: 8mm;
  }

  .name-eyebrow {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 10pt;
    color: #7a7c99;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-bottom: 3mm;
  }

  .name {
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-size: 38pt;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: #2b2e8d;
    margin-bottom: 8mm;
    border-bottom: 1px solid #f8821e;
    padding-bottom: 4mm;
    width: 70%;
  }

  .body-text {
    font-size: 13pt;
    line-height: 1.6;
    color: #4a4c70;
    max-width: 200mm;
    margin-bottom: 6mm;
  }

  .body-text .hl-evento {
    color: #f8821e;
    font-weight: 700;
  }

  .footer-text {
    font-size: 10pt;
    line-height: 1.5;
    color: #7a7c99;
    max-width: 200mm;
    margin-bottom: 6mm;
    font-style: italic;
  }

  .signatures {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 20mm;
    margin-top: auto;
    margin-bottom: 4mm;
    width: 100%;
  }

  .signature {
    text-align: center;
    min-width: 60mm;
    max-width: 80mm;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* Slot de altura fixa pra logo da organização — sempre renderizado quando
     QUALQUER assinatura tem logo, garantindo que as linhas e os nomes fiquem
     na mesma altura em todas as colunas. */
  .sig-org-logo-slot {
    height: 14mm;
    margin-bottom: 2mm;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .sig-org-logo-slot img {
    max-height: 100%;
    max-width: 30mm;
    object-fit: contain;
  }

  /* Slot da assinatura: linha sempre visível no fundo + imagem (PNG com fundo
     transparente) sobreposta no topo. Permite que a assinatura escaneada
     "encoste" na linha como se fosse assinada à mão. */
  .sig-slot {
    position: relative;
    width: 60mm;
    height: 14mm;
    margin: 0 auto 1mm;
  }

  .sig-line {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    border-bottom: 1px solid #2b2e8d;
  }

  .sig-image-overlay {
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center bottom;
    /* transform aplicado inline com base em image_size:
       small: scale(0.7), medium: scale(1.0), large: scale(1.3), xlarge: scale(1.6).
       Mantém a base alinhada à linha (transform-origin: center bottom). */
  }

  .sig-name {
    font-size: 11pt;
    font-weight: 600;
    color: #2b2e8d;
  }

  .sig-role {
    font-size: 9pt;
    color: #7a7c99;
    margin-top: 1mm;
  }

  .verify {
    position: absolute;
    bottom: 18mm;
    right: 24mm;
    text-align: center;
    z-index: 2;
  }
  .verify img {
    width: 22mm;
    height: 22mm;
    border: 1px solid #f1f2ec;
  }
  .verify-code {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 8pt;
    color: #7a7c99;
    margin-top: 1mm;
    letter-spacing: 0.08em;
  }
  .verify-url {
    font-size: 7pt;
    color: #7a7c99;
    margin-top: 0.5mm;
  }
</style>
</head>
<body>
  ${bgImgHtml}
  ${
    hasBackground
      ? ''
      : `<div class="border-outer"></div>
  <div class="border-inner"></div>
  <div class="corner tl"></div>
  <div class="corner tr"></div>
  <div class="corner bl"></div>
  <div class="corner br"></div>`
  }

  <div class="content">
    ${hasBackground ? '' : logoHtml}
    ${hasBackground ? '' : `<div class="header-text">${headerHtml}</div>`}

    <div class="text-block">
      <div class="name-eyebrow">Certificamos que</div>
      <div class="name">${escapeHtml(input.participantName)}</div>
      <div class="body-text">${bodyHtml}</div>
      ${footerHtml ? `<div class="footer-text">${footerHtml}</div>` : ''}
    </div>

    <div class="signatures">
      <div class="signature">
        ${anyOrgLogo ? '<div class="sig-org-logo-slot"></div>' : ''}
        <div class="sig-slot">
          <div class="sig-line"></div>
        </div>
        <div class="sig-name">${escapeHtml(input.participantName)}</div>
        <div class="sig-role">Participante</div>
      </div>
      ${signaturesHtml}
    </div>
  </div>

  <div class="verify">
    <img src="${escapeHtml(input.qrCodeDataUrl)}" alt="" />
    <div class="verify-code">${escapeHtml(input.verificationCode)}</div>
    <div class="verify-url">${escapeHtml(input.verificationUrl)}</div>
  </div>
</body>
</html>`
}
