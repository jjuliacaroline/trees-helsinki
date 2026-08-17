import assert from 'node:assert/strict'
import test from 'node:test'
import {
  classifyTree,
  matchesFruitCategory,
} from '../src/data/treeClassifications'
import type { HelsinkiTreeFeature } from '../src/data/treeRegistry'

function tree(
  id: number,
  genus: string | null,
  species: string | null,
): HelsinkiTreeFeature {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [24.94, 60.17] },
    properties: {
      id,
      tunnus: `TREE-${id}`,
      kadunnimi: null,
      puistonnimi: null,
      paatyyppi: null,
      suomenknimi: null,
      suku: genus,
      laji: species,
      kokoluokka: null,
      istutusvuosi: null,
      datanomistaja: null,
      paivitetty_tietopalveluun: null,
    },
  }
}

test('classifies only the supported high-confidence fruit species', () => {
  const cases = [
    ['Malus', 'domestica', 'apple', 'Omena'],
    ['Pyrus', 'communis', 'pear', 'Päärynä'],
    ['Prunus', 'domestica', 'plum', 'Luumu'],
    ['Prunus', 'avium', 'sweet-cherry', 'Makeakirsikka'],
    ['Prunus', 'cerasus', 'sour-cherry', 'Hapankirsikka'],
  ] as const

  for (const [genus, species, id, label] of cases) {
    assert.deepEqual(classifyTree(tree(1, genus, species)), { id, label })
  }
})

test('normalizes taxonomy without changing source properties', () => {
  const sourceTree = tree(1, ' Prunus ', 'DOMESTICA')
  const before = structuredClone(sourceTree.properties)

  assert.deepEqual(classifyTree(sourceTree), { id: 'plum', label: 'Luumu' })
  assert.deepEqual(sourceTree.properties, before)
})

test('leaves ambiguous and unsupported records unclassified', () => {
  for (const sourceTree of [
    tree(1, 'Prunus', 'sp.'),
    tree(2, 'Prunus', null),
    tree(3, null, 'domestica'),
    tree(4, 'Acer', 'platanoides'),
  ]) {
    assert.equal(classifyTree(sourceTree), null)
    assert.equal(matchesFruitCategory(sourceTree, 'edible'), false)
  }
})

test('cherry shortcut includes sweet and sour cherry only', () => {
  assert.equal(matchesFruitCategory(tree(1, 'Prunus', 'avium'), 'cherry'), true)
  assert.equal(matchesFruitCategory(tree(2, 'Prunus', 'cerasus'), 'cherry'), true)
  assert.equal(matchesFruitCategory(tree(3, 'Prunus', 'domestica'), 'cherry'), false)
})
