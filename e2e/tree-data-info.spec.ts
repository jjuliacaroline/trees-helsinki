import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const treeFixturePath = fileURLToPath(new URL('./fixtures/trees.geojson', import.meta.url))
const metadataFixturePath = fileURLToPath(
  new URL('./fixtures/tree-metadata.json', import.meta.url),
)

test('shows source attribution, snapshot metadata, and the data-quality notice', async ({ page }) => {
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

  const info = page.getByLabel('Puutietojen lähde')
  await expect(info.getByRole('link', { name: 'Helsingin kaupungin puurekisteri' })).toBeVisible()
  await expect(info).toContainText('Helsingin kaupunkiympäristön toimiala')
  await expect(info.getByRole('link', { name: 'CC BY 4.0' })).toBeVisible()
  await expect(info).toContainText('Snapshot muodostettu')
  await expect(info).toContainText('25.8.2026')
  await expect(info).toContainText('Lähdedata päivitetty')
  await expect(info).toContainText('1.8.2026')
  await expect(info).toContainText('Rekisteri ei kata kaikkia Helsingin puita')
})
