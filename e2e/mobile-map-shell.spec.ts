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
    await expect(page.getByRole('button', { name: 'Sulje suodattimet' })).toBeVisible()
    await page.getByLabel('Näytä', { exact: true }).selectOption('plum')
    await expect(page.getByRole('button', { name: 'Suodattimet, 1 aktiivista' })).toBeVisible()
    await page.getByRole('button', { name: 'Sulje suodattimet' }).click()

    await page.getByRole('button', { name: 'Tietoja puuaineistosta' }).click()
    const info = page.getByLabel('Mobiilin puutietojen lähde')
    await expect(info).toBeVisible()
    await expect(info.getByLabel('Puutietojen lähde')).toBeVisible()
    await page.getByRole('button', { name: 'Sulje puuaineiston tiedot' }).click()

    await page.getByRole('button', { name: 'Käytä sijaintiani' }).click()
    await expect(page.getByRole('button', { name: 'Päivitä sijainti' })).toBeVisible()
  })
})
