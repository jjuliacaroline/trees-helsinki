import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildTreeFilterOptions,
  buildTreeSearchIndex,
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
  tree(103, { suku: 'Prunus', laji: 'cerasus', paatyyppi: 'Puisto', istutusvuosi: 2005 }),
  tree(104, { suomenknimi: 'Geometriaton puu', suku: 'Testus' }, null),
  tree(105, { suku: 'Malus', laji: 'domestica', paatyyppi: 'Katu', istutusvuosi: 2010 }),
  tree(106, { suku: 'Pyrus', laji: 'communis', paatyyppi: 'Puisto', istutusvuosi: 2012 }),
  tree(107, { suku: 'Prunus', laji: 'avium', paatyyppi: 'Katu', istutusvuosi: 2015 }),
  tree(108, { suku: 'Prunus', laji: 'sp.', paatyyppi: 'Puisto', istutusvuosi: 2018 }),
]
const searchIndex = buildTreeSearchIndex(trees)

function withFilters(overrides: Partial<TreeFilters>): TreeFilters {
  return { ...EMPTY_TREE_FILTERS, ...overrides }
}

test('search matches source-backed names, taxonomy, location, identifiers, and id', () => {
  const expectedIdsByQuery: Record<string, number[]> = {
    luumu: [101],
    prunus: [101, 103, 107, 108],
    domestica: [101, 105],
    'Prunus domestica': [101],
    Kaivopuisto: [101],
    'P-101': [101],
    '101': [101],
  }

  for (const query of Object.keys(expectedIdsByQuery)) {
    assert.deepEqual(
      filterTrees(trees, withFilters({ search: query }), searchIndex).map((item) => item.properties.id),
      expectedIdsByQuery[query],
    )
  }

  assert.deepEqual(
    filterTrees(trees, withFilters({ search: 'mannerheimintie' }), searchIndex).map(
      (item) => item.properties.id,
    ),
    [102],
  )
})

test('indexed search preserves case-insensitive and whitespace matching', () => {
  for (const query of ['  LUUMU  ', '  prunus domestica  ', '  mannerheimintie  ']) {
    assert.deepEqual(
      filterTrees(trees, withFilters({ search: query }), searchIndex).map((item) => item.properties.id),
      query.includes('manner') ? [102] : [101],
    )
  }
})

test('missing optional values do not break search and non-mappable trees stay off the map', () => {
  assert.deepEqual(
    filterTrees(trees, EMPTY_TREE_FILTERS, searchIndex).map((item) => item.properties.id),
    [101, 102, 103, 105, 106, 107, 108],
  )
  assert.deepEqual(filterTrees(trees, withFilters({ search: 'not-present' }), searchIndex), [])
})

test('active filter groups use intersection semantics', () => {
  const result = filterTrees(
    trees,
    withFilters({
      search: 'prunus',
      fruitCategory: 'plum',
      genus: 'Prunus',
      species: 'domestica',
      mainType: 'Puisto',
      plantingYear: 2001,
      sizeClass: '10-20',
    }),
    searchIndex,
  )

  assert.deepEqual(result.map((item) => item.properties.id), [101])
})

test('fruit categories filter supported species without guessing ambiguous records', () => {
  assert.deepEqual(
    filterTrees(trees, withFilters({ fruitCategory: 'plum' }), searchIndex).map((item) => item.properties.id),
    [101],
  )
  assert.deepEqual(
    filterTrees(trees, withFilters({ fruitCategory: 'cherry' }), searchIndex).map((item) => item.properties.id),
    [103, 107],
  )
  assert.deepEqual(
    filterTrees(trees, withFilters({ fruitCategory: 'edible' }), searchIndex).map((item) => item.properties.id),
    [101, 103, 105, 106, 107],
  )
})

test('filter options come from mappable source data and species narrow by genus', () => {
  const allOptions = buildTreeFilterOptions(trees)
  assert.deepEqual(allOptions.genera, ['Acer', 'Malus', 'Prunus', 'Pyrus'])
  assert.deepEqual(allOptions.species, ['avium', 'cerasus', 'communis', 'domestica', 'platanoides', 'sp.'])
  assert.deepEqual(allOptions.mainTypes, ['Katu', 'Puisto'])
  assert.deepEqual(allOptions.plantingYears, [2018, 2015, 2012, 2010, 2005, 2001, 1998])
  assert.deepEqual(allOptions.sizeClasses, ['10-20', '20-30'])

  const prunusOptions = buildTreeFilterOptions(trees, 'Prunus')
  assert.deepEqual(prunusOptions.species, ['avium', 'cerasus', 'domestica', 'sp.'])
})

test('fruit category narrows source-backed filter options before genus cascading', () => {
  const plumOptions = buildTreeFilterOptions(trees, '', 'plum')
  assert.deepEqual(plumOptions.genera, ['Prunus'])
  assert.deepEqual(plumOptions.species, ['domestica'])
  assert.deepEqual(plumOptions.mainTypes, ['Puisto'])
  assert.deepEqual(plumOptions.plantingYears, [2001])
  assert.deepEqual(plumOptions.sizeClasses, ['10-20'])

  const cherryOptions = buildTreeFilterOptions(trees, 'Prunus', 'cherry')
  assert.deepEqual(cherryOptions.genera, ['Prunus'])
  assert.deepEqual(cherryOptions.species, ['avium', 'cerasus'])
})
