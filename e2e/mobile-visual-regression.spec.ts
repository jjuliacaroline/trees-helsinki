import { expect, test, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const treeFixturePath = fileURLToPath(new URL('./fixtures/trees.geojson', import.meta.url))
const metadataFixturePath = fileURLToPath(
  new URL('./fixtures/tree-metadata.json', import.meta.url),
)

const mobileViewports = [
  { name: '320x700', width: 320, height: 700 },
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
] as const

async function loadMobileApp(page: Page) {
  await page.route('**/data/trees.geojson', (route) =>
    route.fulfill({ path: treeFixturePath, contentType: 'application/json' }),
  )
  await page.route('**/data/generated/tree-metadata.json', (route) =>
    route.fulfill({ path: metadataFixturePath, contentType: 'application/json' }),
  )
  await page.route('https://tiles.openfreemap.org/styles/liberty', (route) =>
    route.fulfill({ json: { version: 8, sources: {}, layers: [] } }),
  )
  await page.goto('/')
  await expect(page.getByLabel('Karttatulokset')).toContainText('7 puuta kartalla')
  await expect(page.getByLabel('Interactive map of Helsinki trees')).toBeVisible()
}

async function selectPlumFromMap(page: Page) {
  await page.getByLabel('Hae puita kartalta').fill('Luumu')
  await expect(page.getByLabel('Karttatulokset')).toContainText('1 puuta kartalla')

  const canvas = page.locator('.maplibregl-canvas')
  const sheet = page.getByRole('region', { name: 'Valitun puun tiedot' })
  await expect(async () => {
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    expect(await sheet.isVisible()).toBe(true)
  }).toPass({ timeout: 5_000 })

  return sheet
}

async function expectNoHorizontalOverflow(page: Page) {
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
}

async function expectStableMobileScreenshot(page: Page, name: string) {
  const mapCanvas = page.locator('.maplibregl-canvas')
  await expect(mapCanvas).toBeVisible()
  await expect(page).toHaveScreenshot(name, {
    animations: 'disabled',
    caret: 'hide',
  })
}

test.describe('mobile responsive visual regression', () => {
  for (const viewport of mobileViewports) {
    test(`keeps the default map usable at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await loadMobileApp(page)

      await expect(page.getByLabel('Hae puita kartalta')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Tallennetut puut, 0' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Suodattimet, 0 aktiivista' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Tietoja puuaineistosta' })).toBeVisible()
      await expectNoHorizontalOverflow(page)

      await expectStableMobileScreenshot(page, `mobile-default-${viewport.name}.png`)
    })
  }
})

test.describe('approved mobile states visual regression', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('protects the filter sheet state', async ({ page }) => {
    await loadMobileApp(page)

    await page.getByRole('button', { name: 'Suodattimet, 0 aktiivista' }).click()
    const sheet = page.getByRole('region', { name: 'Suodattimet' })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByLabel('Näytä', { exact: true })).toBeVisible()
    await expect(sheet.getByLabel('Istutusvuosi alkaen')).toBeVisible()
    await expect(sheet.getByLabel('Istutusvuosi asti')).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await expectStableMobileScreenshot(page, 'mobile-filter-390x844.png')
  })

  test('protects the selected-tree details state', async ({ page }) => {
    await loadMobileApp(page)
    const sheet = await selectPlumFromMap(page)

    await expect(sheet.getByRole('heading', { name: 'Luumu' })).toBeVisible()
    await expect(sheet).toContainText('Prunus domestica')
    await expect(sheet.getByRole('button', { name: 'Tallenna' })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await expectStableMobileScreenshot(page, 'mobile-tree-details-390x844.png')
  })

  test('protects the saved-trees state', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('trees-helsinki.saved-tree-ids.v1', '[1001]')
    })
    await loadMobileApp(page)

    await page.getByRole('button', { name: 'Tallennetut puut, 1' }).click()
    const sheet = page.getByRole('region', { name: 'Tallennetut puut' })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('heading', { name: 'Tallennetut (1)' })).toBeVisible()
    await expect(sheet).toContainText('Luumu')
    await expectNoHorizontalOverflow(page)

    await expectStableMobileScreenshot(page, 'mobile-saved-trees-390x844.png')
  })

  test('protects the data-info state', async ({ page }) => {
    await loadMobileApp(page)

    await page.getByRole('button', { name: 'Tietoja puuaineistosta' }).click()
    const sheet = page.getByRole('region', { name: 'Mobiilin puutietojen lähde' })
    await expect(sheet).toBeVisible()
    await expect(sheet).toContainText('Helsingin kaupungin puurekisteri')
    await expect(sheet).toContainText('CC BY 4.0')
    await expectNoHorizontalOverflow(page)

    await expectStableMobileScreenshot(page, 'mobile-data-info-390x844.png')
  })
})
