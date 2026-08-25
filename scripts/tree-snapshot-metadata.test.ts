import assert from 'node:assert/strict'
import test from 'node:test'
import {
  latestSourceUpdatedAt,
  normalizeTreeSnapshotMetadata,
} from '../src/data/treeSnapshotMetadata'
import type { HelsinkiTreeFeature } from '../src/data/treeRegistry'

const tree = (id: number, updatedAt: string | null): HelsinkiTreeFeature => ({
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
    paivitetty_tietopalveluun: updatedAt,
  },
  geometry: null,
})

test('normalizes generated snapshot metadata', () => {
  assert.deepEqual(
    normalizeTreeSnapshotMetadata({
      generatedAt: '2026-08-25T07:30:00.000Z',
      sourceUpdatedAt: '2026-08-01',
    }),
    {
      generatedAt: '2026-08-25T07:30:00.000Z',
      sourceUpdatedAt: '2026-08-01',
    },
  )
})

test('allows missing source update information', () => {
  assert.deepEqual(
    normalizeTreeSnapshotMetadata({
      generatedAt: '2026-08-25T07:30:00.000Z',
    }),
    {
      generatedAt: '2026-08-25T07:30:00.000Z',
      sourceUpdatedAt: null,
    },
  )
})

test('rejects invalid generated metadata dates', () => {
  assert.throws(
    () => normalizeTreeSnapshotMetadata({ generatedAt: 'not-a-date', sourceUpdatedAt: null }),
    /generatedAt must be a valid date string/,
  )
})

test('derives the latest valid source update from tree records', () => {
  assert.equal(
    latestSourceUpdatedAt([
      tree(1, '2026-07-15'),
      tree(2, null),
      tree(3, 'not-a-date'),
      tree(4, '2026-08-01'),
      tree(5, '2026-07-30'),
    ]),
    '2026-08-01',
  )
})
