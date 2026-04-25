import puppeteer from 'puppeteer-core'
import path from 'path'
import fs from 'fs'

function getChromiumPath(): string {
  // Tenta encontrar o chromium instalado pelo pacote npm
  const npmChromium = path.join(process.cwd(), 'node_modules', 'chromium', 'lib', 'chromium', 'chrome-win', 'chrome.exe')
  if (fs.existsSync(npmChromium)) return npmChromium

  // Fallback para Linux/Mac
  const linuxPath = path.join(process.cwd(), 'node_modules', 'chromium', 'lib', 'chromium', 'chrome-linux', 'chrome')
  if (fs.existsSync(linuxPath)) return linuxPath

  // Tenta usar o require do pacote chromium
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const chromium = require('chromium')
    if (chromium.path) return chromium.path
  } catch {
    // ignore
  }

  throw new Error('Chromium não encontrado. Rode: npm install chromium')
}

export type PdfOptions = {
  format?: 'A4' | 'Letter'
  landscape?: boolean
  margin?: { top?: string; right?: string; bottom?: string; left?: string }
}

const DEFAULT_OPTS: PdfOptions = {
  format: 'A4',
  landscape: false,
  margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
}

export async function generatePdfFromHtml(
  html: string,
  options: PdfOptions = {}
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTS, ...options }
  const executablePath = getChromiumPath()

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    // Garante que webfonts (Google Fonts) terminaram de carregar antes do
    // print — evita que o PDF seja gerado com fallback.
    await page.evaluate(() => (document as any).fonts?.ready)

    const pdfBuffer = await page.pdf({
      format: opts.format,
      landscape: opts.landscape,
      printBackground: true,
      margin: opts.margin,
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

// Gera N PDFs reusando UM único browser. Crítico pra mass-send (sem isso, cada
// chromium spawn custa ~1-2s). Útil quando admin envia certificado pra dezenas
// de pessoas de uma vez.
export async function generatePdfFromHtmlBatch(
  htmls: string[],
  options: PdfOptions = {}
): Promise<Buffer[]> {
  if (htmls.length === 0) return []
  const opts = { ...DEFAULT_OPTS, ...options }
  const executablePath = getChromiumPath()

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const buffers: Buffer[] = []
    for (const html of htmls) {
      const page = await browser.newPage()
      try {
        await page.setContent(html, { waitUntil: 'networkidle0' })
        await page.evaluate(() => (document as any).fonts?.ready)
        const pdfBuffer = await page.pdf({
          format: opts.format,
          landscape: opts.landscape,
          printBackground: true,
          margin: opts.margin,
        })
        buffers.push(Buffer.from(pdfBuffer))
      } finally {
        await page.close()
      }
    }
    return buffers
  } finally {
    await browser.close()
  }
}
