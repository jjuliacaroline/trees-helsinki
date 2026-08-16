import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  hasRepresentativeHelsinkiCoordinate,
  normalizeTreeFeature,
  normalizeTreeFeatureCollection,
  sortTreeFeatures,
} from '../src/data/treeRegistry'

const fixtureUrl = new URL('./fixtures/puurekisteri.sample.json', import.meta.url)
const fixture: unknown = JSON.parse(await readFile(fixtureUrl, 'utf8'))

test('normalizes documented registry fields and missing optional values', () => {
  const collection = normalizeTreeFeatureCollection(fixture)
  const streetTree = collection.features.find((feature) => feature.properties.id === 101)
  const unknownTree = collection.features.find((feature) => feature.properties.id === 103)

  assert.ok(streetTree)
  assert.equal(streetTree.properties.tunnus, 'K-000101')
  assert.equal(streetTree.properties.kadunnimi, 'Esimerkkikatu')
  assert.equal(streetTree.properties.suku, 'Tilia')
  assert.equal(streetTree.properties.laji, null)
  assert.equal(streetTree.properties.istutusvuosi, 1998)
  assert.ok(unknownTree)
  assert.equal(unknownTree.properties.suomenknimi, null)
  assert.equal(unknownTree.geometry, null)
})

test('sorts tree features deterministically by numeric id', () => {
  const collection = normalizeTreeFeatureCollection(fixture)
  const sorted = sortTreeFeatures(collection.features)

  assert.deepEqual(
    sorted.map((feature) => feature.properties.id),
    [101, 102, 103],
  )
})

test('recognizes representative Helsinki WGS84 coordinates', () => {
  const collection = normalizeTreeFeatureCollection(fixture)
  assert.equal(hasRepresentativeHelsinkiCoordinate(collection), true)

  const reversedCoordinates = normalizeTreeFeatureCollection({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { id: 1 },
        geometry: { type: 'Point', coordinates: [60.1699, 24.9384] },
      },
    ],
  })

  assert.equal(hasRepresentativeHelsinkiCoordinate(reversedCoordinates), false)
})

test('rejects materially invalid source contracts', () => {
  assert.throws(
    () =>
      normalizeTreeFeature({
        type: 'Feature',
        properties: { id: 'not-an-integer' },
        geometry: null,
      }),
    /id must be an integer/,
  )

  assert.throws(
    () =>
      normalizeTreeFeature({
        type: 'Feature',
        properties: { id: 1, suku: 123 },
        geometry: null,
      }),
    /suku must be a string or null/,
  )

  assert.throws(
    () =>
      normalizeTreeFeature({
        type: 'Feature',
        properties: { id: 1 },
        geometry: { type: 'LineString', coordinates: [] },
      }),
    /geometry.type must be Point/,
  )
})
