import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getTreeMapCategory,
  projectTreeHighlightsForMap,
  projectTreesForMap,
} from '../src/map/treeMapData'
import {
  getFruitClusterCategory,
  getTreeClusterColorExpression,
  TREE_MARKER_STYLES,
  TREE_MIXED_FRUIT_CLUSTER_COLOR,
} from '../src/map/treeMarkerStyles'
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

test('highlight data contains only the selected tree, leaving ordinary markers to the clustered source', () => {
  const highlights = projectTreeHighlightsForMap(
    [
      tree(301),
      tree(302, { suku: 'Pyrus', laji: 'communis' }),
      tree(303, { suku: 'Acer', laji: 'platanoides' }),
    ],
    302,
  )

  assert.deepEqual(highlights, [
    {
      type: 'Feature',
      id: 302,
      properties: { category: 'pear', selected: true },
      geometry: { type: 'Point', coordinates: [24.94, 60.17] },
    },
  ])
  assert.deepEqual(projectTreeHighlightsForMap([tree(304)], null), [])
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

test('identifies homogeneous and mixed edible cluster composition', () => {
  assert.equal(
    getFruitClusterCategory({
      pointCount: 3,
      appleCount: 3,
      pearCount: 0,
      plumCount: 0,
      cherryCount: 0,
    }),
    'apple',
  )
  assert.equal(
    getFruitClusterCategory({
      pointCount: 4,
      appleCount: 2,
      pearCount: 0,
      plumCount: 0,
      cherryCount: 2,
    }),
    'mixed',
  )
})

test('cluster styling uses the selected fruit color and neutral mixed-fruit color', () => {
  assert.equal(getTreeClusterColorExpression('pear'), TREE_MARKER_STYLES.pear.color)

  const edibleExpression = getTreeClusterColorExpression('edible')
  assert.equal(edibleExpression[edibleExpression.length - 1], TREE_MIXED_FRUIT_CLUSTER_COLOR)
})
