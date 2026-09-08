/**
 * Check-in composer interaction and mobile-width checks.
 * Run: npx --yes tsx scripts/screenshot-checkin.ts
 *
 * Optional: CHECKIN_BASE_URL=http://127.0.0.1:8099
 */
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium, type Page } from 'playwright'

const OUT_DIR = path.join(process.cwd(), 'artifacts', 'check-in')
const CANDIDATE_PORTS = [8099, 8081, 8105, 8104, 19006]
const VIEWPORTS = [
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
] as const

function assert(label: string, condition: boolean) {
  if (!condition) throw new Error(label)
}

async function serverUp(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { redirect: 'manual' })
    return res.status < 500
  } catch {
    return false
  }
}

async function resolveBaseUrl(): Promise<string> {
  if (process.env.CHECKIN_BASE_URL) {
    const url = process.env.CHECKIN_BASE_URL.replace(/\/$/, '')
    if (await serverUp(url)) return url
    throw new Error(`CHECKIN_BASE_URL is not responding: ${url}`)
  }
  for (const port of CANDIDATE_PORTS) {
    const url = `http://127.0.0.1:${port}`
    if (await serverUp(url)) return url
  }
  throw new Error(
    'No Expo web server found. Start one (expo start --web) or set CHECKIN_BASE_URL.',
  )
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const frame =
      document.querySelector('[data-testid="phone-frame"]') ?? document.body
    return frame.scrollWidth > frame.clientWidth + 1
  })
  assert('no horizontal scrolling', overflow === false)
}

async function runFlow(page: Page, prefix: string, base: string) {
  await page.goto(`${base}/check-in-preview`)
  await page.getByRole('heading', { name: "Today's check-in" }).waitFor()
  await page.screenshot({
    path: path.join(OUT_DIR, `${prefix}-empty.png`),
    fullPage: true,
  })

  await page.getByRole('button', { name: 'Save check-in' }).click()
  await page.getByText('Choose how you’re feeling first.').waitFor()
  const reflection = page.getByPlaceholder('A few words, if you’d like…')
  assert('validation keeps the field', await reflection.isVisible())

  await page.getByTestId('connection-option-4').click()
  const selectedState =
    (await page.getByTestId('connection-option-4').getAttribute('aria-checked')) ===
      'true' ||
    (await page.getByTestId('connection-option-4').getAttribute('aria-selected')) ===
      'true'
  assert('close is selected', selectedState)
  await page.screenshot({
    path: path.join(OUT_DIR, `${prefix}-connection.png`),
    fullPage: true,
  })

  await reflection.fill('Sunset on the porch last spring')
  await page.getByRole('checkbox', { name: 'Home' }).click()
  await page.getByRole('checkbox', { name: 'Other' }).click()
  await page.getByLabel('What else shaped your day?').fill('A long walk')
  assert('other field is visible', await page.getByLabel('What else shaped your day?').isVisible())
  assert(
    'skip today is visible',
    await page.getByRole('button', { name: 'Skip today' }).isVisible(),
  )

  await page.getByRole('button', { name: 'More about privacy' }).click()
  await page.getByText('Your check-in stays private').waitFor()
  const sheet = page.getByTestId('privacy-sheet')
  assert(
    'privacy sheet names mutual reveal',
    (await sheet.innerText()).includes('until they check in too'),
  )
  assert(
    'privacy sheet names local loss',
    (await sheet.innerText()).toLowerCase().includes('uninstall') ||
      (await sheet.innerText()).includes('this device'),
  )
  await page.getByTestId('privacy-sheet').getByRole('button', { name: 'Close' }).click()
  await page.getByTestId('privacy-sheet').waitFor({ state: 'hidden' })

  await page.getByLabel('What else shaped your day?').scrollIntoViewIfNeeded()
  await page.screenshot({
    path: path.join(OUT_DIR, `${prefix}-filled.png`),
    fullPage: true,
  })

  await noHorizontalScroll(page)

  await page.getByRole('button', { name: 'Save check-in' }).click()
  await page.getByRole('heading', { name: 'Check-in saved' }).waitFor()
  await page.getByText('We’ll reveal your check-ins when you’ve both shared.').waitFor()
  await page.screenshot({
    path: path.join(OUT_DIR, `${prefix}-saved.png`),
    fullPage: true,
  })
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const base = await resolveBaseUrl()
  const browser = await chromium.launch()
  try {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({ viewport })
      page.setDefaultTimeout(120000)
      await runFlow(page, viewport.name, base)
      await page.close()
    }
  } finally {
    await browser.close()
  }
  console.log('screenshot-checkin: ok →', OUT_DIR)
}

main().catch((err) => {
  console.error('❌', err)
  process.exit(1)
})
