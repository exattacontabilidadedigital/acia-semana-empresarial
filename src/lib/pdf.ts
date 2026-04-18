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

export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  const executablePath = getChromiumPath()

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}
