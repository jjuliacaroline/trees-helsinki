import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getTreeMapCategory,
  projectTreeHighlightsForMap,
  projectTreesForMap,
} from '../src/map/treeMapData'
import type { HelsinkiTreeFeature } from '../src/data/treeRegistry'

function tree(
  id: number,
  overrides: Partial<HelsinkiTreeFeature['properties']> = {},
  geometry: HelsinkiTreeFeature['geometry'] = { type: 'Point', coordinates: [24.94, 60.17] },
): HelsinkiTreeFeature {
  return {
    type: 'Feature',
    geometry,
    properties: {
      id,
      tunnus: `TREE-${id}`,
      kadunnimi: 'Mannerheimintie',
      puistonnimi: 'Kaivopuisto',
      paatyyppi: 'Puisto',
      suomenknimi: 'Luumu',
      suku: 'Prunus',
      laji: 'domestica',
      kokoluokka: '10-20',
      istutusvuosi: 2001,
      datanomistaja: 'Helsinki',
      paivitetty_tietopalveluun: '2026-01-01',
      ...overrides,
    },
  }
}

test('projects only mappable trees with minimal map styling data', () => {
  const projected = projectTreesForMap([
    tree(101),
    tree(102, {}, null),
    tree(103, { suku: 'Acer', laji: 'platanoides' }),
  ])

  assert.deepEqual(projected, [
    {
      type: 'Feature',
      id: 101,
      properties: { category: 'plum' },
      geometry: { type: 'Point', coordinates: [24.94, 60.17] },
    },
    {
      type: 'Feature',
      id: 103,
      properties: { category: 'other' },
      geometry: { type: 'Point', coordinates: [24.94, 60.17] },
    },
  ])
})

test('maps supported classifications to the four visual fruit categories', () => {
  assert.equal(getTreeMapCategory(tree(201, { suku: 'Malus', laji: 'domestica' })), 'apple')
  assert.equal(getTreeMapCategory(tree(202, { suku: 'Pyrus', laji: 'communis' })), 'pear')
  assert.equal(getTreeMapCategory(tree(203, { suku: 'Prunus', laji: 'domestica' })), 'plum')
  assert.equal(getTreeMapCategory(tree(204, { suku: 'Prunus', laji: 'avium' })), 'cherry')
  assert.equal(getTreeMapCategory(tree(205, { suku: 'Prunus', laji: 'cerasus' })), 'cherry')
  assert.equal(getTreeMapCategory(tree(206, { suku: 'Prunus', laji: 'sp.' })), 'other')
})

test('wide-zoom highlight data contains fruit trees but not unrelated trees', () => {
  const highlights = projectTreeHighlightsForMap(
    [
      tree(301),
      tree(302, { suku: 'Pyrus', laji: 'communis' }),
      tree(303, { suku: 'Acer', laji: 'platanoides' }),
    ],
    null,
  )

  assert.deepEqual(
    highlights.map((feature) => [feature.id, feature.properties.category, feature.properties.selected]),
    [
      [301, 'plum', false],
      [302, 'pear', false],
    ],
  )
})

test('selected non-fruit tree is included in highlight data for the selection ring', () => {
  const highlights = projectTreeHighlightsForMap(
    [tree(401, { suku: 'Acer', laji: 'platanoides' })],
    401,
  )

  assert.deepEqual(highlights, [
    {
      type: 'Feature',
      id: 401,
      properties: { category: 'other', selected: true },
      geometry: { type: 'Point', coordinates: [24.94, 60.17] },
    },
  ])
})
