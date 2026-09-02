import { expect, test, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const treeFixturePath = fileURLToPath(new URL('./fixtures/trees.geojson', import.meta.url))
const treeStatus = (page: Page) => page.locator('.tree-filter-panel__status')

async function loadTestApp(page: Page) {
  await page.route('**/data/trees.geojson', (route) => route.fulfill({ path: treeFixturePath, contentType: 'application/json' }))
  await page.route('https://tiles.openfreemap.org/styles/liberty', (route) => route.fulfill({ json: { version: 8, sources: {}, layers: [] } }))
  await page.goto('/')
  await expect(treeStatus(page)).toHaveText('7 puuta kartalla')
}

async function openAdvancedFilters(page: Page) {
  const filters = page.locator('.tree-filter-panel__filters')
  if (!(await filters.getAttribute('open'))) await filters.locator('summary').click()
}

async function selectMappedPlum(page: Page) {
  await page.getByLabel('Näytä', { exact: true }).selectOption('plum')
  await expect(treeStatus(page)).toHaveText('1 puuta kartalla')
  const canvas = page.locator('.maplibregl-canvas')
  const details = page.getByLabel('Selected tree details')
  await expect(canvas).toBeVisible()
  await expect(async () => {
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    expect(await details.isVisible()).toBe(true)
  }).toPass({ timeout: 5_000 })
  return details
}

test.beforeEach(async ({ page }) => {
  await loadTestApp(page)
})

test('fruit categories update result state and source-backed options', async ({ page }) => {
  const category = page.getByLabel('Näytä', { exact: true })
  await category.selectOption('plum')
  await expect(treeStatus(page)).toHaveText('1 puuta kartalla')
  await openAdvancedFilters(page)
  await expect(page.getByLabel('Suku', { exact: true }).locator('option')).toHaveText(['Kaikki suvut', 'Prunus'])
  await expect(page.getByLabel('Laji', { exact: true }).locator('option')).toHaveText(['Kaikki lajit', 'domestica'])
  await category.selectOption('cherry')
  await expect(treeStatus(page)).toHaveText('2 puuta kartalla')
  await expect(page.getByLabel('Laji', { exact: true }).locator('option')).toHaveText(['Kaikki lajit', 'avium', 'cerasus'])
})

test('ambiguous Prunus stays non-edible and category changes clear source-backed selections', async ({ page }) => {
  const category = page.getByLabel('Näytä', { exact: true })
  await category.selectOption('edible')
  await expect(treeStatus(page)).toHaveText('5 puuta kartalla')
  await category.selectOption('cherry')
  await openAdvancedFilters(page)
  await page.getByLabel('Suku', { exact: true }).selectOption('Prunus')
  await page.getByLabel('Laji', { exact: true }).selectOption('avium')
  await expect(treeStatus(page)).toHaveText('1 puuta kartalla')
  await category.selectOption('pear')
  await expect(page.getByLabel('Suku', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('Laji', { exact: true })).toHaveValue('')
  await expect(treeStatus(page)).toHaveText('1 puuta kartalla')
  await page.getByRole('button', { name: 'Tyhjennä haku ja suodattimet' }).click()
  await expect(category).toHaveValue('')
  await expect(treeStatus(page)).toHaveText('7 puuta kartalla')
})

test('planting-year range includes both boundary years', async ({ page }) => {
  await openAdvancedFilters(page)
  await page.getByLabel('Alkaen', { exact: true }).fill('2010')
  await page.getByLabel('Asti', { exact: true }).fill('2015')
  await expect(treeStatus(page)).toHaveText('3 puuta kartalla')
})

test('selecting a mapped plum opens its classified details', async ({ page }) => {
  const details = await selectMappedPlum(page)
  await expect(details.getByRole('heading', { name: 'Luumu' })).toBeVisible()
  await expect(details).toContainText('Prunus domestica')
  await expect(details.getByLabel('Trees Helsinki -luokitus')).toContainText('Luumu')
  await expect(details).toContainText('24.938400, 60.169900')
  await expect(details.getByRole('button', { name: 'Kopioi' })).toBeVisible()
})

test('nearby results respect the active plum filter when geolocation is granted', async ({ page }) => {
  await page.context().grantPermissions(['geolocation'])
  await page.context().setGeolocation({ longitude: 24.9384, latitude: 60.1699 })
  await page.getByLabel('Näytä', { exact: true }).selectOption('plum')
  await page.getByRole('button', { name: 'Käytä sijaintiani' }).click()
  const nearby = page.getByLabel('Lähimmät puut')
  await expect(nearby.getByRole('heading', { name: 'Lähimmät puut' })).toBeVisible()
  await expect(nearby).toContainText('Luumu')
  await expect(nearby).toContainText('0 m')
})

test('saved tree ids survive reload and resolve back to the current dataset', async ({ page }) => {
  const details = await selectMappedPlum(page)
  await details.getByRole('button', { name: '♡ Tallenna puu' }).click()
  await expect(details.getByRole('button', { name: '♥ Tallennettu' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('trees-helsinki.saved-tree-ids.v1'))).toBe('[1001]')

  await page.reload()
  const savedView = page.getByRole('button', { name: 'Tallennetut (1)' })
  await expect(savedView).toBeVisible()
  await savedView.click()
  await expect(page.getByText('1 tallennettua puuta')).toBeVisible()
  await page.locator('.tree-quick-list').getByRole('button', { name: /Luumu/ }).click()
  const reloadedDetails = page.getByLabel('Selected tree details')
  await expect(reloadedDetails.getByRole('heading', { name: 'Luumu' })).toBeVisible()
  await reloadedDetails.getByRole('button', { name: '♥ Tallennettu' }).click()
  await expect(page.getByLabel('Puiden haku ja suodatus').getByText('Ei tallennettuja puita.')).toBeVisible()
})

test('unavailable geolocation is non-blocking', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined })
  })
  await page.reload()
  await expect(treeStatus(page)).toHaveText('7 puuta kartalla')
  await page.getByRole('button', { name: 'Käytä sijaintiani' }).click()
  await expect(page.getByText('Sijainti ei ole käytettävissä tässä selaimessa.')).toBeVisible()
  await page.getByLabel('Näytä', { exact: true }).selectOption('plum')
  await expect(treeStatus(page)).toHaveText('1 puuta kartalla')
})

test('permission denial is non-blocking and clears the previous location', async ({ page }) => {
  await page.addInitScript(() => {
    let requestCount = 0
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback, error?: PositionErrorCallback) => {
          requestCount += 1
          if (requestCount === 1) {
            success({
              coords: { longitude: 24.9384, latitude: 60.1699 } as GeolocationCoordinates,
              timestamp: Date.now(),
            } as GeolocationPosition)
          } else {
            error?.({ code: 1, message: 'Permission denied' } as GeolocationPositionError)
          }
        },
      },
    })
  })
  await page.reload()

  const locationButton = page.getByRole('button', { name: 'Käytä sijaintiani' })
  await locationButton.click()
  await expect(page.getByRole('heading', { name: 'Lähimmät puut' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Päivitä sijaintini' })).toBeVisible()

  await page.getByRole('button', { name: 'Päivitä sijaintini' }).click()
  await expect(page.getByText('Sijaintilupaa ei annettu. Karttaa ja suodattimia voi käyttää normaalisti.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Lähimmät puut' })).not.toBeVisible()

  await page.getByLabel('Näytä', { exact: true }).selectOption('plum')
  await expect(treeStatus(page)).toHaveText('1 puuta kartalla')
})
