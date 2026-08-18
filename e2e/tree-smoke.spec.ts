import { expect, test, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const treeFixturePath = fileURLToPath(new URL('./fixtures/trees.geojson', import.meta.url))
const treeStatus = (page: Page) => page.locator('.tree-filter-panel__status')

async function loadTestApp(page: Page) {
  await page.route('**/data/trees.geojson', (route) =>
    route.fulfill({ path: treeFixturePath, contentType: 'application/json' }),
  )
  await page.route('https://tiles.openfreemap.org/styles/liberty', (route) =>
    route.fulfill({
      json: {
        version: 8,
        sources: {},
        layers: [],
      },
    }),
  )

  await page.goto('/')
  await expect(treeStatus(page)).toHaveText('7 puuta kartalla')
}

async function openAdvancedFilters(page: Page) {
  const filters = page.locator('.tree-filter-panel__filters')
  if (!(await filters.getAttribute('open'))) {
    await filters.locator('summary').click()
  }
}

test.beforeEach(async ({ page }) => {
  await loadTestApp(page)
})

test('fruit categories update result state and source-backed options', async ({ page }) => {
  const category = page.getByLabel('Näytä', { exact: true })

  await category.selectOption('plum')
  await expect(treeStatus(page)).toHaveText('1 puuta kartalla')

  await openAdvancedFilters(page)
  await expect(page.getByLabel('Suku', { exact: true }).locator('option')).toHaveText([
    'Kaikki suvut',
    'Prunus',
  ])
  await expect(page.getByLabel('Laji', { exact: true }).locator('option')).toHaveText([
    'Kaikki lajit',
    'domestica',
  ])

  await category.selectOption('cherry')
  await expect(treeStatus(page)).toHaveText('2 puuta kartalla')
  await expect(page.getByLabel('Laji', { exact: true }).locator('option')).toHaveText([
    'Kaikki lajit',
    'avium',
    'cerasus',
  ])
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
  await page.getByLabel('Näytä', { exact: true }).selectOption('plum')
  await expect(treeStatus(page)).toHaveText('1 puuta kartalla')

  const canvas = page.locator('.maplibregl-canvas')
  await expect(canvas).toBeVisible()
  const details = page.getByLabel('Selected tree details')

  await expect(async () => {
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    if (!box) {
      return
    }

    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await expect(details).toBeVisible({ timeout: 0 })
  }).toPass({ timeout: 5_000 })

  await expect(details.getByRole('heading', { name: 'Luumu' })).toBeVisible()
  await expect(details).toContainText('Prunus domestica')
  await expect(details.getByLabel('Trees Helsinki -luokitus')).toContainText('Luumu')
})
