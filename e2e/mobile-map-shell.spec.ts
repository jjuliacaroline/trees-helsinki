import { expect, test, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const treeFixturePath = fileURLToPath(new URL('./fixtures/trees.geojson', import.meta.url))

async function loadMobileApp(page: Page) {
  await page.route('**/data/trees.geojson', (route) => route.fulfill({ path: treeFixturePath, contentType: 'application/json' }))
  await page.route('https://tiles.openfreemap.org/styles/liberty', (route) => route.fulfill({ json: { version: 8, sources: {}, layers: [] } }))
  await page.goto('/')
  await expect(page.getByLabel('Karttatulokset')).toContainText('7 puuta kartalla')
}

async function selectPlumFromMap(page: Page) {
  await page.getByLabel('Hae puita kartalta').fill('Luumu')
  await expect(page.getByLabel('Karttatulokset')).toContainText('1 puuta kartalla')

  const canvas = page.locator('.maplibregl-canvas')
  const sheet = page.getByLabel('Valitun puun tiedot')
  await expect(async () => {
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    expect(await sheet.isVisible()).toBe(true)
  }).toPass({ timeout: 5_000 })

  return sheet
}

test.describe('mobile map-first shell', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('keeps the map primary while search and compact controls use real state', async ({ page }) => {
    await loadMobileApp(page)

    await expect(page.getByLabel('Interactive map of Helsinki trees')).toBeVisible()
    await expect(page.getByLabel('Hae puita kartalta')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tallennetut puut, 0' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Suodattimet, 0 aktiivista' })).toBeVisible()
    await expect(page.locator('.tree-filter-panel')).not.toBeVisible()
    await expect(page.locator('.app-shell > .tree-data-info')).not.toBeVisible()

    await page.getByLabel('Hae puita kartalta').fill('Luumu')
    await expect(page.getByLabel('Karttatulokset')).toContainText('1 puuta kartalla')
  })

  test('selected tree opens the approved contextual sheet with real data and existing actions', async ({ page }) => {
    await loadMobileApp(page)
    const sheet = await selectPlumFromMap(page)

    await expect(sheet.getByRole('heading', { name: 'Luumu' })).toBeVisible()
    await expect(sheet).toContainText('Prunus domestica')
    await expect(sheet).toContainText('2010')
    await expect(sheet.getByLabel(/Kasvitieteellinen kuvitus lajille Luumu/)).toBeVisible()
    await expect(sheet).not.toContainText('päästä')

    await expect(page.getByLabel('Hae puita kartalta')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tallennetut puut, 0' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Suodattimet, 0 aktiivista' })).not.toBeVisible()
    await expect(page.getByLabel('Karttatulokset')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Käytä sijaintiani' })).toBeVisible()
    await expect(page.locator('.maplibregl-ctrl-top-right')).toBeVisible()
    await expect(page.getByLabel('Selected tree details')).not.toBeVisible()

    await sheet.getByRole('button', { name: 'Tallenna' }).click()
    await expect(sheet.getByRole('button', { name: 'Tallennettu' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tallennetut puut, 1' })).toBeVisible()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('trees-helsinki.saved-tree-ids.v1'))).toBe('[1001]')

    await sheet.getByRole('button', { name: 'Näytä kaikki tiedot' }).click()
    const fullDetails = sheet.getByLabel('Kaikki puun tiedot')
    await expect(fullDetails).toContainText('TEST-PLUM')
    await expect(fullDetails).toContainText('24.938400, 60.169900')
    await expect(fullDetails).toContainText('Helsinki')

    await page.getByRole('button', { name: 'Sulje valitun puun tiedot' }).click()
    await expect(page.getByRole('button', { name: 'Suodattimet, 0 aktiivista' })).toBeVisible()
    await expect(page.getByLabel('Karttatulokset')).toBeVisible()
  })

  test('selected tree shows distance only after valid user location is available', async ({ page }) => {
    await page.context().grantPermissions(['geolocation'])
    await page.context().setGeolocation({ longitude: 24.9384, latitude: 60.1699 })
    await loadMobileApp(page)

    await page.getByRole('button', { name: 'Käytä sijaintiani' }).click()
    await expect(page.getByRole('button', { name: 'Päivitä sijainti' })).toBeVisible()

    const sheet = await selectPlumFromMap(page)
    await expect(sheet).toContainText('0 m päästä')
  })

  test('saved, filter, info and location controls stay wired to existing behavior', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('trees-helsinki.saved-tree-ids.v1', '[1001]')
    })
    await page.context().grantPermissions(['geolocation'])
    await page.context().setGeolocation({ longitude: 24.9384, latitude: 60.1699 })
    await loadMobileApp(page)

    const saved = page.getByRole('button', { name: 'Tallennetut puut, 1' })
    await saved.click()
    await expect(saved).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByLabel('Karttatulokset')).toContainText('1 puuta kartalla')
    await saved.click()
    await expect(saved).toHaveAttribute('aria-pressed', 'false')

    await page.getByRole('button', { name: 'Suodattimet, 0 aktiivista' }).click()
    const sheet = page.locator('.mobile-bottom-sheet')
    await expect(sheet).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sulje suodattimet' })).toBeVisible()
    await sheet.getByLabel('Näytä', { exact: true }).selectOption('plum')
    await expect(sheet).toContainText('1 puuta kartalla')
    await page.getByRole('button', { name: 'Sulje suodattimet' }).click()
    await expect(page.getByRole('button', { name: 'Suodattimet, 1 aktiivista' })).toBeVisible()

    await page.getByRole('button', { name: 'Tietoja puuaineistosta' }).click()
    const info = page.getByLabel('Mobiilin puutietojen lähde')
    await expect(info).toBeVisible()
    await expect(info.getByLabel('Puutietojen lähde')).toBeVisible()
    await page.getByRole('button', { name: 'Sulje puuaineiston tiedot' }).click()

    await page.getByRole('button', { name: 'Käytä sijaintiani' }).click()
    await expect(page.getByRole('button', { name: 'Päivitä sijainti' })).toBeVisible()
  })
})
