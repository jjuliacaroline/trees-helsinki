import { expect, test, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const treeFixturePath = fileURLToPath(new URL('./fixtures/trees.geojson', import.meta.url))

async function loadMobileApp(page: Page) {
  await page.route('**/data/trees.geojson', (route) => route.fulfill({ path: treeFixturePath, contentType: 'application/json' }))
  await page.route('https://tiles.openfreemap.org/styles/liberty', (route) => route.fulfill({ json: { version: 8, sources: {}, layers: [] } }))
  await page.goto('/')
  await expect(page.getByLabel('Karttatulokset')).toContainText('7 puuta kartalla')
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

  test('selected tree details do not overlap lower mobile map controls', async ({ page }) => {
    await loadMobileApp(page)
    await page.getByLabel('Hae puita kartalta').fill('Luumu')
    await expect(page.getByLabel('Karttatulokset')).toContainText('1 puuta kartalla')

    const canvas = page.locator('.maplibregl-canvas')
    const details = page.getByLabel('Selected tree details')
    await expect(async () => {
      const box = await canvas.boundingBox()
      expect(box).not.toBeNull()
      if (!box) return
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      expect(await details.isVisible()).toBe(true)
    }).toPass({ timeout: 5_000 })

    await expect(page.getByLabel('Hae puita kartalta')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Suodattimet, 0 aktiivista' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Käytä sijaintiani' })).not.toBeVisible()
    await expect(page.getByLabel('Karttatulokset')).not.toBeVisible()
    await expect(page.locator('.maplibregl-ctrl-top-right')).not.toBeVisible()

    await details.getByRole('button', { name: 'Sulje puun tiedot' }).click()
    await expect(page.getByRole('button', { name: 'Suodattimet, 0 aktiivista' })).toBeVisible()
    await expect(page.getByLabel('Karttatulokset')).toBeVisible()
  })

  test('mobile filter sheet uses the real filters immediately and preserves them when reopened', async ({ page }) => {
    await loadMobileApp(page)

    await page.getByRole('button', { name: 'Suodattimet, 0 aktiivista' }).click()
    const sheet = page.locator('.mobile-bottom-sheet')
    await expect(sheet).toBeVisible()
    await expect(page.getByLabel('Interactive map of Helsinki trees')).toBeVisible()
    await expect(page.getByLabel('Hae puita kartalta')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tallennetut puut, 0' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Käytä sijaintiani' })).not.toBeVisible()
    await expect(page.getByLabel('Karttatulokset')).not.toBeVisible()

    await sheet.getByLabel('Näytä', { exact: true }).selectOption('plum')
    await expect(sheet).toContainText('1 puuta kartalla')

    await sheet.getByLabel('Istutusvuosi alkaen').fill('2010')
    await sheet.getByLabel('Istutusvuosi asti').fill('2010')
    await expect(sheet).toContainText('1 puuta kartalla')

    await page.getByRole('button', { name: 'Sulje suodattimet' }).click()
    await expect(page.getByRole('button', { name: 'Suodattimet, 2 aktiivista' })).toBeVisible()

    await page.getByRole('button', { name: 'Suodattimet, 2 aktiivista' }).click()
    await expect(sheet.getByLabel('Näytä', { exact: true })).toHaveValue('plum')
    await expect(sheet.getByLabel('Istutusvuosi alkaen')).toHaveValue('2010')
    await expect(sheet.getByLabel('Istutusvuosi asti')).toHaveValue('2010')

    await sheet.getByRole('button', { name: 'Tyhjennä' }).click()
    await expect(sheet.getByLabel('Näytä', { exact: true })).toHaveValue('')
    await expect(sheet.getByLabel('Istutusvuosi alkaen')).toHaveValue('')
    await expect(sheet).toContainText('7 puuta kartalla')
  })

  test('saved, info and location controls stay wired to existing behavior', async ({ page }) => {
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

    await page.getByRole('button', { name: 'Tietoja puuaineistosta' }).click()
    const info = page.getByLabel('Mobiilin puutietojen lähde')
    await expect(info).toBeVisible()
    await expect(info.getByLabel('Puutietojen lähde')).toBeVisible()
    await page.getByRole('button', { name: 'Sulje puuaineiston tiedot' }).click()

    await page.getByRole('button', { name: 'Käytä sijaintiani' }).click()
    await expect(page.getByRole('button', { name: 'Päivitä sijainti' })).toBeVisible()
  })
})

test('filter sheet remains usable at a narrow, height-constrained mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await loadMobileApp(page)

  await page.getByRole('button', { name: 'Suodattimet, 0 aktiivista' }).click()
  const sheet = page.locator('.mobile-bottom-sheet')
  await expect(sheet).toBeVisible()
  await expect(sheet.getByLabel('Puutyyppi')).toBeVisible()
  await expect(sheet.getByLabel('Laji')).toBeVisible()

  const infoButton = sheet.getByRole('button', { name: 'Tietoja puuaineistosta' })
  await infoButton.scrollIntoViewIfNeeded()
  await expect(infoButton).toBeVisible()
  await page.getByRole('button', { name: 'Sulje suodattimet' }).click()
  await expect(page.getByLabel('Karttatulokset')).toBeVisible()
})
