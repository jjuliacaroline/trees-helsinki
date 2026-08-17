import assert from 'node:assert/strict'
import test from 'node:test'
import { projectTreesForMap } from '../src/map/treeMapData'
import type { HelsinkiTreeFeature } from '../src/data/treeRegistry'

function tree(
  id: number,
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
    },
  }
}

test('projects only mappable tree geometry and numeric id for MapLibre', () => {
  const projected = projectTreesForMap([tree(101), tree(102, null)])

  assert.deepEqual(projected, [
    {
      type: 'Feature',
      id: 101,
      properties: {},
      geometry: { type: 'Point', coordinates: [24.94, 60.17] },
    },
  ])
})
