import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildTreeFilterOptions,
  EMPTY_TREE_FILTERS,
  filterTrees,
  type TreeFilters,
} from '../src/data/treeFiltering'
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
      ...overrides,
    },
  }
}

const trees = [
  tree(101, {
    tunnus: 'P-101',
    suomenknimi: 'Luumu',
    suku: 'Prunus',
    laji: 'domestica',
    puistonnimi: 'Kaivopuisto',
    paatyyppi: 'Puisto',
    istutusvuosi: 2001,
    kokoluokka: '10-20',
  }),
  tree(102, {
    tunnus: 'K-102',
    suomenknimi: 'Metsävaahtera',
    suku: 'Acer',
    laji: 'platanoides',
    kadunnimi: 'Mannerheimintie',
    paatyyppi: 'Katu',
    istutusvuosi: 1998,
    kokoluokka: '20-30',
  }),
  tree(103, { suku: 'Prunus', laji: 'cerasus', paatyyppi: 'Puisto' }),
  tree(104, { suomenknimi: 'Geometriaton puu', suku: 'Testus' }, null),
]

function withFilters(overrides: Partial<TreeFilters>): TreeFilters {
  return { ...EMPTY_TREE_FILTERS, ...overrides }
}

test('search matches source-backed names, taxonomy, location, identifiers, and id', () => {
  for (const query of ['luumu', 'Prunus', 'domestica', 'Prunus domestica', 'Kaivopuisto', 'P-101', '101']) {
    assert.deepEqual(filterTrees(trees, withFilters({ search: query })).map((item) => item.properties.id), [101])
  }

  assert.deepEqual(filterTrees(trees, withFilters({ search: 'mannerheimintie' })).map((item) => item.properties.id), [102])
})

test('missing optional values do not break search and non-mappable trees stay off the map', () => {
  assert.deepEqual(filterTrees(trees, EMPTY_TREE_FILTERS).map((item) => item.properties.id), [101, 102, 103])
  assert.deepEqual(filterTrees(trees, withFilters({ search: 'not-present' })), [])
})

test('active filter groups use intersection semantics', () => {
  const result = filterTrees(
    trees,
    withFilters({
      search: 'prunus',
      genus: 'Prunus',
      species: 'domestica',
      mainType: 'Puisto',
      plantingYear: 2001,
      sizeClass: '10-20',
    }),
  )

  assert.deepEqual(result.map((item) => item.properties.id), [101])
})

test('filter options come from mappable source data and species narrow by genus', () => {
  const allOptions = buildTreeFilterOptions(trees)
  assert.deepEqual(allOptions.genera, ['Acer', 'Prunus'])
  assert.deepEqual(allOptions.species, ['cerasus', 'domestica', 'platanoides'])
  assert.deepEqual(allOptions.mainTypes, ['Katu', 'Puisto'])
  assert.deepEqual(allOptions.plantingYears, [2001, 1998])
  assert.deepEqual(allOptions.sizeClasses, ['10-20', '20-30'])

  const prunusOptions = buildTreeFilterOptions(trees, 'Prunus')
  assert.deepEqual(prunusOptions.species, ['cerasus', 'domestica'])
})
