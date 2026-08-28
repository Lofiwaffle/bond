/**
 * App Store / Play screenshot sizes from onboarding.
 * Run: npx --yes tsx scripts/screenshot-store.ts
 *
 * Optional: STORE_BASE_URL=http://127.0.0.1:8105
 */
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium, type Page } from 'playwright'

const OUT_DIR = path.join(process.cwd(), 'store', 'screenshots')
const CANDIDATE_PORTS = [8105, 8104, 8099, 8081, 19006]

const PRESETS = [
  {
    name: 'iphone-67',
    width: 440,
    height: 956,
    deviceScaleFactor: 3,
  },
  {
    name: 'iphone-61',
    width: 393,
    height: 852,
    deviceScaleFactor: 3,
  },
  {
    name: 'play-phone',
    width: 360,
    height: 640,
    deviceScaleFactor: 3,
  },
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
  if (process.env.STORE_BASE_URL) {
    const url = process.env.STORE_BASE_URL.replace(/\/$/, '')
    if (await serverUp(url)) return url
    throw new Error(`STORE_BASE_URL is not responding: ${url}`)
  }
  for (const port of CANDIDATE_PORTS) {
    const url = `http://127.0.0.1:${port}`
    if (await serverUp(url)) return url
  }
  throw new Error(
    'No Expo web server found. Start one (expo start --web) or set STORE_BASE_URL.',
  )
}

async function headingInView(page: Page, name: string) {
  await page.getByRole('heading', { name }).waitFor()
  await page.waitForFunction((n) => {
    const nodes = Array.from(document.querySelectorAll('[role="heading"]'))
    const el = nodes.find((node) => node.textContent?.trim() === n)
    if (!el) return false
    const rect = el.getBoundingClientRect()
    const frame =
      document.querySelector('[data-testid="phone-frame"]') ?? document.body
    const box = frame.getBoundingClientRect()
    return (
      rect.left >= box.left - 2 &&
      rect.right <= box.right + 2 &&
      rect.top >= box.top - 2 &&
      rect.width > 40
    )
  }, name)
}

async function shot(page: Page, name: string) {
  const file = path.join(OUT_DIR, `${name}.png`)
  await page.screenshot({ path: file, fullPage: false })
  return file
}

async function walk(page: Page, prefix: string) {
  await page.getByTestId('onboarding-screen').waitFor({ timeout: 120_000 })
  await headingInView(page, 'Before distance builds')
  await shot(page, `${prefix}-1-promise`)

  await page.getByTestId('onboarding-next').click()
  await headingInView(
    page,
    'Check in privately. Reveal when you both show up.',
  )
  await shot(page, `${prefix}-2-reveal-sealed`)
  if ((await page.getByTestId('onboarding-sealed').count()) > 0) {
    await page.getByTestId('onboarding-next').click()
  }
  await page
    .getByTestId('onboarding-sealed')
    .waitFor({ state: 'detached', timeout: 10_000 })
  await shot(page, `${prefix}-2-reveal-open`)

  await page.getByTestId('onboarding-next').click()
  await headingInView(page, 'Start a Bond, then invite one person.')
  await shot(page, `${prefix}-3-invite`)
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const base = await resolveBaseUrl()
  const browser = await chromium.launch()
  const failures: string[] = []

  try {
    for (const preset of PRESETS) {
      const page = await browser.newPage({
        viewport: { width: preset.width, height: preset.height },
        deviceScaleFactor: preset.deviceScaleFactor,
      })
      try {
        await page.goto(`${base}/onboarding`, { waitUntil: 'domcontentloaded' })
        await walk(page, preset.name)
        const box = page.viewportSize()
        assert(`${preset.name} viewport`, Boolean(box))
      } catch (error) {
        failures.push(`${preset.name}: ${(error as Error).message}`)
        await shot(page, `${preset.name}-failure`).catch(() => undefined)
      } finally {
        await page.close()
      }
    }
  } finally {
    await browser.close()
  }

  if (failures.length > 0) {
    console.error(failures.join('\n'))
    throw new Error(`${failures.length} store screenshot check(s) failed`)
  }
  console.log(`store screenshots ok → ${OUT_DIR}`)
}

void main()
