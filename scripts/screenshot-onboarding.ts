/**
 * Onboarding layout and screenshot checks.
 * Run: npx --yes tsx scripts/screenshot-onboarding.ts
 *
 * Optional: ONBOARDING_BASE_URL=http://127.0.0.1:8099
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium, type Page } from 'playwright'

const OUT_DIR = path.join(process.cwd(), 'artifacts', 'onboarding')
const CANDIDATE_PORTS = [8105, 8104, 8099, 8081, 19006]
const VIEWPORTS = [
  { name: '320x568', width: 320, height: 568 },
  { name: '390x844', width: 390, height: 844 },
  { name: 'landscape-844x390', width: 844, height: 390 },
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
  if (process.env.ONBOARDING_BASE_URL) {
    const url = process.env.ONBOARDING_BASE_URL.replace(/\/$/, '')
    if (await serverUp(url)) return url
    throw new Error(`ONBOARDING_BASE_URL is not responding: ${url}`)
  }
  for (const port of CANDIDATE_PORTS) {
    const url = `http://127.0.0.1:${port}`
    if (await serverUp(url)) return url
  }
  throw new Error(
    'No Expo web server found. Start one (expo start --web) or set ONBOARDING_BASE_URL.',
  )
}

async function headingInView(page: Page, name: string) {
  const heading = page.getByRole('heading', { name })
  await heading.waitFor()
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

async function scrollSlideToEnd(page: Page, slideId: string) {
  await page.evaluate((id) => {
    const slide = document.querySelector(`[data-testid="${id}"]`)
    if (!slide) return
    const scroller = (
      Array.from(slide.querySelectorAll('*')) as HTMLElement[]
    ).find((node) => {
      const style = window.getComputedStyle(node)
      return (
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        node.scrollHeight > node.clientHeight + 2
      )
    })
    if (scroller) scroller.scrollTop = scroller.scrollHeight
  }, slideId)
}

async function waitForOnboarding(page: Page) {
  await page.getByTestId('onboarding-screen').waitFor({ timeout: 120_000 })
  await headingInView(page, 'Before distance builds')
}

async function shot(page: Page, name: string) {
  const frame = page.getByTestId('phone-frame')
  const target = (await frame.count()) > 0 ? frame : page
  const file = path.join(OUT_DIR, `${name}.png`)
  await target.screenshot({ path: file })
  return file
}

async function footerVisible(page: Page) {
  return page.evaluate(() => {
    const footer = document.querySelector('[data-testid="onboarding-footer"]')
    if (!footer) return { ok: false, reason: 'missing footer' }
    const rect = footer.getBoundingClientRect()
    const viewH = window.innerHeight
    const viewW = window.innerWidth
    const fully =
      rect.top >= -1 &&
      rect.bottom <= viewH + 1 &&
      rect.left >= -1 &&
      rect.right <= viewW + 1 &&
      rect.height > 20
    return fully
      ? { ok: true, reason: '' }
      : {
          ok: false,
          reason: `footer clipped t=${rect.top.toFixed(0)} b=${rect.bottom.toFixed(0)} view=${viewW}x${viewH}`,
        }
  })
}

async function slideCanScrollIfNeeded(page: Page, slideId: string) {
  return page.evaluate((id) => {
    const slide = document.querySelector(`[data-testid="${id}"]`)
    if (!slide) return { ok: false, reason: `missing ${id}` }
    const scroller = slide.querySelector('[class*="css-"]') ?? slide
    const nodes = Array.from(slide.querySelectorAll('*')) as HTMLElement[]
    const overflowParent = nodes.find((node) => {
      const style = window.getComputedStyle(node)
      return (
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        node.scrollHeight > node.clientHeight + 2
      )
    })
    const hiddenClip = nodes.find((node) => {
      const style = window.getComputedStyle(node)
      if (style.overflowY !== 'hidden' && style.overflow !== 'hidden') {
        return false
      }
      return node.scrollHeight > node.clientHeight + 8 && node === slide
    })
    if (hiddenClip && !overflowParent) {
      return {
        ok: false,
        reason: `${id} clips content without a vertical scroller (${hiddenClip.scrollHeight}>${hiddenClip.clientHeight})`,
      }
    }
    const title = slide.querySelector('[role="header"]')
    if (title && overflowParent) {
      const titleRect = title.getBoundingClientRect()
      const box = overflowParent.getBoundingClientRect()
      const outOfView = titleRect.bottom > box.bottom + 4
      if (outOfView && overflowParent.scrollHeight <= overflowParent.clientHeight) {
        return { ok: false, reason: `${id} title is clipped and not scrollable` }
      }
    }
    return { ok: true, reason: overflowParent ? 'scrollable' : 'fits' }
  }, slideId)
}

async function noUnreachableClip(page: Page, testId: string) {
  return page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`)
    if (!el) return { ok: false, reason: `missing ${id}` }
    const rect = el.getBoundingClientRect()
    let parent = el.parentElement
    let sawScroller = false
    while (parent && parent !== document.body) {
      const style = window.getComputedStyle(parent)
      const box = parent.getBoundingClientRect()
      const clips =
        rect.bottom > box.bottom + 2 || rect.top < box.top - 2
      const isScroller =
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        parent.scrollHeight > parent.clientHeight + 2
      if (isScroller) sawScroller = true
      if (
        clips &&
        (style.overflowY === 'hidden' || style.overflow === 'hidden') &&
        !isScroller &&
        !sawScroller
      ) {
        return {
          ok: false,
          reason: `${id} clipped by unscrollable ${parent.getAttribute('data-testid') ?? parent.className}`,
        }
      }
      parent = parent.parentElement
    }
    return { ok: true, reason: sawScroller ? 'in scroller' : 'visible' }
  }, testId)
}

async function walkSlides(page: Page, prefix: string) {
  const dots = page.locator('[data-testid^="onboarding-dot-"]')
  assert(`${prefix}: three stages`, (await dots.count()) === 3)

  let visible = await footerVisible(page)
  assert(`${prefix} promise footer: ${visible.reason}`, visible.ok)
  let scroll = await slideCanScrollIfNeeded(page, 'onboarding-slide-promise')
  assert(`${prefix} promise scroll: ${scroll.reason}`, scroll.ok)
  await shot(page, `${prefix}-1-promise`)

  await page.getByTestId('onboarding-next').click()
  await headingInView(
    page,
    'Check in privately. Reveal when you both show up.',
  )
  visible = await footerVisible(page)
  assert(`${prefix} reveal footer: ${visible.reason}`, visible.ok)
  scroll = await slideCanScrollIfNeeded(page, 'onboarding-slide-reveal')
  assert(`${prefix} reveal scroll: ${scroll.reason}`, scroll.ok)
  await shot(page, `${prefix}-2-reveal-sealed`)

  const sealed = page.getByTestId('onboarding-sealed')
  if ((await sealed.count()) > 0) {
    await page.getByTestId('onboarding-next').click()
  }
  await page.getByTestId('onboarding-sealed').waitFor({ state: 'detached', timeout: 10_000 })
  const clip = await noUnreachableClip(page, 'onboarding-reveal')
  assert(`${prefix} reveal cards: ${clip.reason}`, clip.ok)
  scroll = await slideCanScrollIfNeeded(page, 'onboarding-slide-reveal')
  assert(`${prefix} revealed scroll: ${scroll.reason}`, scroll.ok)
  await shot(page, `${prefix}-2-reveal-open`)
  await scrollSlideToEnd(page, 'onboarding-slide-reveal')
  await page.getByText('Work ran late. I felt far from you tonight.').waitFor()
  visible = await footerVisible(page)
  assert(`${prefix} reveal footer after scroll: ${visible.reason}`, visible.ok)
  await shot(page, `${prefix}-2-reveal-scrolled`)

  await page.getByTestId('onboarding-next').click()
  await headingInView(page, 'Start a Bond, then invite one person.')
  visible = await footerVisible(page)
  assert(`${prefix} invite footer: ${visible.reason}`, visible.ok)
  scroll = await slideCanScrollIfNeeded(page, 'onboarding-slide-invite')
  assert(`${prefix} invite scroll: ${scroll.reason}`, scroll.ok)
  await shot(page, `${prefix}-3-invite`)
  await scrollSlideToEnd(page, 'onboarding-slide-invite')
  await page.getByText('Bond is not therapy or emergency support.').waitFor()
  visible = await footerVisible(page)
  assert(`${prefix} invite footer after scroll: ${visible.reason}`, visible.ok)
  await shot(page, `${prefix}-3-invite-scrolled`)

  const leftover = await page
    .getByRole('heading', { name: 'See the same day through both eyes' })
    .count()
  assert(`${prefix}: understand is not its own stage`, leftover === 0)
}

async function checkSignupErrors(page: Page, prefix: string) {
  await page.getByRole('button', { name: 'Create a Bond' }).click()
  await page.getByLabel('Display name').waitFor({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Create a Bond' }).click()
  const alert = page.getByRole('alert')
  await alert.waitFor({ timeout: 5_000 })
  const message = (await alert.innerText()).trim()
  assert(`${prefix} live region has copy`, message.length > 0)
  const focused = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    return {
      tag: el?.tagName ?? '',
      label:
        el?.getAttribute('aria-label') ??
        el?.getAttribute('placeholder') ??
        '',
    }
  })
  assert(
    `${prefix} focus first invalid (got ${focused.label || focused.tag})`,
    /display name/i.test(focused.label) || focused.tag === 'INPUT',
  )
  await shot(page, `${prefix}-signup-error`)
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const base = await resolveBaseUrl()
  const browser = await chromium.launch()
  const failures: string[] = []

  try {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
      })
      try {
        await page.goto(`${base}/onboarding`, { waitUntil: 'domcontentloaded' })
        await waitForOnboarding(page)
        await walkSlides(page, viewport.name)
        if (viewport.name === '390x844') {
          await checkSignupErrors(page, viewport.name)
        }
      } catch (error) {
        failures.push(`${viewport.name}: ${(error as Error).message}`)
        await shot(page, `${viewport.name}-failure`).catch(() => undefined)
      } finally {
        await page.close()
      }
    }

    const large = await browser.newPage({
      viewport: { width: 390, height: 844 },
    })
    try {
      await large.goto(`${base}/onboarding`, { waitUntil: 'domcontentloaded' })
      await waitForOnboarding(large)
      await large.evaluate(() => {
        document.body.style.zoom = '1.35'
      })
      await large.waitForTimeout(300)
      await walkSlides(large, 'large-text-390x844')
    } catch (error) {
      failures.push(`large-text: ${(error as Error).message}`)
      await shot(large, 'large-text-390x844-failure').catch(() => undefined)
    } finally {
      await large.close()
    }
  } finally {
    await browser.close()
  }

  const report = {
    base,
    outDir: OUT_DIR,
    failures,
  }
  await writeFile(
    path.join(OUT_DIR, 'report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  )
  if (failures.length > 0) {
    console.error(failures.join('\n'))
    throw new Error(`${failures.length} onboarding screenshot check(s) failed`)
  }
  console.log(`onboarding screenshots ok → ${OUT_DIR}`)
}

void main()
