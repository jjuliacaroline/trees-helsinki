import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const treeFixturePath = fileURLToPath(new URL('./fixtures/trees.geojson', import.meta.url))
const metadataFixturePath = fileURLToPath(
  new URL('./fixtures/tree-metadata.json', import.meta.url),
)

async function loadMobileApp(page: Page) {
  await page.route('**/data/trees.geojson', (route) => route.fulfill({ path: treeFixturePath, contentType: 'application/json' }))
  await page.route('**/data/generated/tree-metadata.json', (route) =>
    route.fulfill({ path: metadataFixturePath, contentType: 'application/json' }),
  )
  await page.route('https://tiles.openfreemap.org/styles/liberty', (route) => route.fulfill({ json: { version: 8, sources: {}, layers: [] } }))
  await page.goto('/')
  await expect(page.getByLabel('Karttatulokset')).toContainText('7 puuta kartalla')
}

async function loadMobileAppWithTechnicalPlaceholder(page: Page) {
  await page.route('**/data/trees.geojson', async (route) => {
    const fixture = JSON.parse(readFileSync(treeFixturePath, 'utf8')) as {
      features: Array<{
        properties: {
          id: number
          suomenknimi: string | null
          suku: string | null
          laji: string | null
        }
      }>
    }
    const technicalTree = fixture.features.find(({ properties }) => properties.id === 1007)
    if (!technicalTree) throw new Error('expected placeholder test tree')
    technicalTree.properties.suomenknimi = 'TunnistamatonLEHTI'
    technicalTree.properties.suku = 'TunnistamatonLEHTI'
    technicalTree.properties.laji = 'sp.'
    await route.fulfill({ json: fixture })
  })
  await page.route('https://tiles.openfreemap.org/styles/liberty', (route) => route.fulfill({ json: { version: 8, sources: {}, layers: [] } }))
  await page.goto('/')
  await expect(page.getByLabel('Karttatulokset')).toContainText('7 puuta kartalla')
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

test.describe('mobile map-first shell', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('keeps the map primary while search and compact controls use real state', async ({ page }) => {
    await loadMobileApp(page)

    await expect(page.getByLabel('Interactive map of Helsinki trees')).toBeVisible()
    await expect(page.getByLabel('Hae puita kartalta')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tallennetut puut, 0' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Suodattimet, 0 aktiivista' })).toBeVisible()
    const attribution = page.locator('.maplibregl-ctrl-attrib')
    await expect(attribution).toBeVisible()
    await expect(attribution).not.toHaveAttribute('open')
    await attribution.locator('summary').click()
    await expect(attribution).toHaveAttribute('open', '')
    await expect(attribution.locator('.maplibregl-ctrl-attrib-inner')).toBeVisible()
    await expect(page.locator('.tree-filter-panel')).not.toBeVisible()
    await expect(page.locator('.app-shell > .tree-data-info')).not.toBeVisible()

    await page.getByLabel('Hae puita kartalta').fill('Luumu')
    await expect(page.getByLabel('Karttatulokset')).toContainText('1 puuta kartalla')
  })

  test('opens mobile Data Info with source metadata and closes', async ({ page }) => {
    await loadMobileApp(page)

    await page.getByRole('button', { name: 'Tietoja puuaineistosta' }).click()

    const info = page.getByRole('region', { name: 'Mobiilin puutietojen lähde' })
    await expect(info).toBeVisible()
    await expect(info.getByRole('heading', { name: 'Tietoja puuaineistosta' })).toBeVisible()
    await expect(
      info.getByRole('link', { name: 'Helsingin kaupungin puurekisteri' }),
    ).toHaveAttribute(
      'href',
      'https://hri.fi/data/en_GB/dataset/helsingin-kaupungin-puurekisteri',
    )
    await expect(info.getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by/4.0/',
    )
    await expect(info).toContainText('Snapshot muodostettu')
    await expect(info).toContainText('25.8.2026')
    await expect(info).toContainText('Lähdedata päivitetty')
    await expect(info).toContainText('1.8.2026')
    await expect(info).toContainText('Rekisteri ei kata kaikkia Helsingin puita')

    await page.getByRole('button', { name: 'Sulje puuaineiston tiedot' }).click()
    await expect(info).not.toBeVisible()
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

  test('keeps the selected tree focused when location is requested after selection', async ({ page }) => {
    await page.context().grantPermissions(['geolocation'])
    await loadMobileApp(page)

    const sheet = await selectPlumFromMap(page)
    await expect(sheet).toBeVisible()

    await page.context().setGeolocation({ longitude: 25.1, latitude: 60.3 })
    await page.getByRole('button', { name: 'Käytä sijaintiani' }).click()
    await expect(page.getByRole('button', { name: 'Päivitä sijainti' })).toBeVisible()
    await expect(sheet).toContainText(/(?:m|km) päästä/)

    await page.getByRole('button', { name: 'Sulje valitun puun tiedot' }).click()
    await expect(sheet).not.toBeVisible()
    await page.waitForTimeout(500)

    const canvas = page.locator('.maplibregl-canvas')
    await expect(async () => {
      const box = await canvas.boundingBox()
      expect(box).not.toBeNull()
      if (!box) return
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      expect(await sheet.isVisible()).toBe(true)
    }).toPass({ timeout: 5_000 })
    await expect(sheet.getByRole('heading', { name: 'Luumu' })).toBeVisible()
  })

  test('saved trees opens as a real-data sheet and can return to the map', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('trees-helsinki.saved-tree-ids.v1', '[1001]')
    })
    await loadMobileApp(page)

    await page.getByRole('button', { name: 'Tallennetut puut, 1' }).click()
    const savedSheet = page.getByRole('region', { name: 'Tallennetut puut' })
    await expect(savedSheet).toBeVisible()
    await expect(savedSheet.getByRole('heading', { name: 'Tallennetut (1)' })).toBeVisible()
    await expect(savedSheet.getByRole('button', { name: 'Sulje tallennetut puut' })).toBeVisible()
    await expect(savedSheet.getByRole('button', { name: 'Takaisin' })).toHaveCount(0)
    await expect(savedSheet).toContainText('Luumu')
    await expect(savedSheet).toContainText('Prunus domestica')
    await expect(savedSheet.locator('.mobile-saved-trees__item')).toHaveCount(1)
    await expect(page.getByLabel('Karttatulokset')).toContainText('7 puuta kartalla')
    await expect(savedSheet).not.toContainText('0 m')
    await expect(page.getByLabel('Hae puita kartalta')).not.toBeVisible()

    await savedSheet.getByRole('button', { name: 'Sulje tallennetut puut' }).click()
    await expect(savedSheet).not.toBeVisible()
    await expect(page.getByLabel('Hae puita kartalta')).toBeVisible()
    await expect(page.getByLabel('Karttatulokset')).toContainText('7 puuta kartalla')
  })

  test('does not duplicate the scientific fallback name in a saved tree row', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('trees-helsinki.saved-tree-ids.v1', '[1007]')
    })
    await page.route('**/data/trees.geojson', async (route) => {
      const fixture = JSON.parse(readFileSync(treeFixturePath, 'utf8')) as {
        features: Array<{
          properties: {
            id: number
            suomenknimi: string | null
          }
        }>
      }
      const scientificOnlyTree = fixture.features.find(({ properties }) => properties.id === 1007)
      if (!scientificOnlyTree) throw new Error('expected scientific-only test tree')
      scientificOnlyTree.properties.suomenknimi = null
      await route.fulfill({ json: fixture })
    })
    await page.route('https://tiles.openfreemap.org/styles/liberty', (route) => route.fulfill({ json: { version: 8, sources: {}, layers: [] } }))
    await page.goto('/')
    await expect(page.getByLabel('Karttatulokset')).toContainText('7 puuta kartalla')

    await page.getByRole('button', { name: 'Tallennetut puut, 1' }).click()
    const savedRow = page.getByRole('region', { name: 'Tallennetut puut' }).locator('.mobile-saved-trees__item')
    const scientificName = savedRow.getByText('Acer platanoides', { exact: true })
    await expect(scientificName).toBeVisible()
    await expect(scientificName).toHaveCount(1)
  })

  test('saved tree distance uses valid user location and selecting a row opens existing details', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('trees-helsinki.saved-tree-ids.v1', '[1001]')
    })
    await page.context().grantPermissions(['geolocation'])
    await page.context().setGeolocation({ longitude: 24.9384, latitude: 60.1699 })
    await loadMobileApp(page)

    await page.getByRole('button', { name: 'Käytä sijaintiani' }).click()
    await page.getByRole('button', { name: 'Tallennetut puut, 1' }).click()
    const savedSheet = page.getByRole('region', { name: 'Tallennetut puut' })
    await expect(savedSheet).toContainText('0 m')

    await savedSheet.getByRole('button', { name: 'Näytä Luumu kartalla' }).click()
    const details = page.getByRole('region', { name: 'Valitun puun tiedot' })
    await expect(details).toBeVisible()
    await expect(details.getByRole('heading', { name: 'Luumu' })).toBeVisible()
    await expect(details.getByRole('button', { name: 'Takaisin tallennettuihin puihin' })).toBeVisible()
    await expect(savedSheet).not.toBeVisible()

    await details.getByRole('button', { name: 'Takaisin tallennettuihin puihin' }).click()
    await expect(savedSheet).toBeVisible()

    await savedSheet.getByRole('button', { name: 'Näytä Luumu kartalla' }).click()
    const reopenedDetails = page.getByRole('region', { name: 'Valitun puun tiedot' })
    await reopenedDetails.getByRole('button', { name: 'Sulje valitun puun tiedot' }).click()
    await expect(reopenedDetails).not.toBeVisible()
    await expect(savedSheet).not.toBeVisible()
    await expect(page.getByLabel('Karttatulokset')).toBeVisible()
  })

  test('presents technical placeholder names conservatively in saved and details views', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('trees-helsinki.saved-tree-ids.v1', '[1001,1007]')
    })
    await loadMobileAppWithTechnicalPlaceholder(page)

    await page.getByRole('button', { name: 'Tallennetut puut, 2' }).click()
    const savedSheet = page.getByRole('region', { name: 'Tallennetut puut' })
    await expect(savedSheet).toContainText('Luumu')
    await expect(savedSheet).toContainText('Prunus domestica')
    await expect(savedSheet).toContainText('Tunnistamaton lehtipuu')
    await expect(savedSheet).not.toContainText('TunnistamatonLEHTI')
    await expect(savedSheet).not.toContainText('TunnistamatonLEHTI sp.')

    await savedSheet.getByRole('button', { name: 'Näytä Tunnistamaton lehtipuu kartalla' }).click()
    const details = page.getByRole('region', { name: 'Valitun puun tiedot' })
    await expect(details.getByRole('heading', { name: 'Tunnistamaton lehtipuu' })).toBeVisible()
    await expect(details.locator('.mobile-tree-details-sheet__identity p')).toHaveCount(0)
    await expect(details).not.toContainText('TunnistamatonLEHTI')
    await expect(details).not.toContainText('TunnistamatonLEHTI sp.')
  })

  test('removing a saved tree updates the list, persisted state and bookmark count immediately', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('trees-helsinki.saved-tree-ids.v1', '[1001]')
    })
    await loadMobileApp(page)

    await page.getByRole('button', { name: 'Tallennetut puut, 1' }).click()
    const savedSheet = page.getByRole('region', { name: 'Tallennetut puut' })
    await savedSheet.getByRole('button', { name: 'Poista Luumu tallennetuista' }).click()

    await expect(savedSheet.getByRole('heading', { name: 'Tallennetut (0)' })).toBeVisible()
    await expect(savedSheet).toContainText('Ei tallennettuja puita.')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('trees-helsinki.saved-tree-ids.v1'))).toBe('[]')

    await savedSheet.getByRole('button', { name: 'Sulje tallennetut puut' }).click()
    await expect(page.getByRole('button', { name: 'Tallennetut puut, 0' })).toBeVisible()
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
    const savedSheet = page.getByRole('region', { name: 'Tallennetut puut' })
    await expect(savedSheet).toBeVisible()
    await savedSheet.getByRole('button', { name: 'Sulje tallennetut puut' }).click()
    await expect(saved).toHaveAttribute('aria-pressed', 'false')

    const filters = page.getByRole('button', { name: 'Suodattimet, 0 aktiivista' })
    await filters.click()
    const sheet = page.getByRole('region', { name: 'Suodattimet' })
    const closeFilters = sheet.getByRole('button', { name: 'Sulje suodattimet' })
    await expect(sheet).toBeVisible()
    await expect(closeFilters).toBeVisible()
    await closeFilters.click()
    await expect(sheet).not.toBeVisible()

    await filters.click()
    await sheet.getByLabel('Näytä', { exact: true }).selectOption('plum')
    await expect(sheet).toContainText('1 puuta kartalla')
    await sheet.getByRole('button', { name: 'Sulje suodattimet' }).click()
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
