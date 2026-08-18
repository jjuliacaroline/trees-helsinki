import assert from 'node:assert/strict'
import test from 'node:test'
import type { HelsinkiTreeFeature } from '../src/data/treeRegistry'
import {
  distanceMeters,
  findNearestTrees,
  formatDistance,
} from '../src/data/treeProximity'

function tree(id: number, coordinates: [number, number] | null): HelsinkiTreeFeature {
  return {
    type: 'Feature',
    properties: {
      id,
      tunnus: null,
      kadunnimi: null,
      puistonnimi: null,
      paatyyppi: null,
      suomenknimi: null,
      suku: null,
      laji: null,
      kokoluokka: null,
      istutusvuosi: null,
      datanomistaja: null,
      paivitetty_tietopalveluun: null,
    },
    geometry: coordinates ? { type: 'Point', coordinates } : null,
  }
}

test('distanceMeters returns a realistic Helsinki-scale distance', () => {
  const distance = distanceMeters([24.9384, 60.1699], [24.9484, 60.1699])

  assert.ok(distance > 500)
  assert.ok(distance < 600)
})

test('findNearestTrees returns the nearest mappable trees in order and respects limit', () => {
  const trees = [
    tree(1, [24.9584, 60.1699]),
    tree(2, null),
    tree(3, [24.9394, 60.1699]),
    tree(4, [24.9484, 60.1699]),
  ]

  const nearest = findNearestTrees(trees, [24.9384, 60.1699], 2)

  assert.deepEqual(nearest.map(({ tree: nearbyTree }) => nearbyTree.properties.id), [3, 4])
  assert.ok(nearest[0].distanceMeters < nearest[1].distanceMeters)
})

test('findNearestTrees returns no results for a non-positive limit', () => {
  assert.deepEqual(findNearestTrees([tree(1, [24.9384, 60.1699])], [24.9384, 60.1699], 0), [])
})

test('formatDistance uses metres below one kilometre and kilometres above it', () => {
  assert.equal(formatDistance(321.4), '321 m')
  assert.match(formatDistance(1420), /^1[,.]4 km$/)
})
