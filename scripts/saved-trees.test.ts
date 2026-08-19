import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SAVED_TREE_IDS_KEY,
  normalizeSavedTreeIds,
  parseSavedTreeIds,
  readSavedTreeIds,
  toggleSavedTreeId,
  writeSavedTreeIds,
} from '../src/data/savedTrees'

test('normalizeSavedTreeIds keeps only unique non-negative integer ids', () => {
  assert.deepEqual(normalizeSavedTreeIds([1, 1, 2, -1, 3.5, '4', null]), [1, 2])
})

test('parseSavedTreeIds handles missing and malformed storage safely', () => {
  assert.deepEqual(parseSavedTreeIds(null), [])
  assert.deepEqual(parseSavedTreeIds('{not-json'), [])
  assert.deepEqual(parseSavedTreeIds('{"id":1}'), [])
})

test('toggleSavedTreeId adds and removes ids without duplicates', () => {
  assert.deepEqual(toggleSavedTreeId([1, 2], 3), [1, 2, 3])
  assert.deepEqual(toggleSavedTreeId([1, 2], 2), [1])
})

test('storage helpers persist only the id array and tolerate read failures', () => {
  let stored: string | null = null
  const storage = {
    getItem(key: string) {
      assert.equal(key, SAVED_TREE_IDS_KEY)
      return stored
    },
    setItem(key: string, value: string) {
      assert.equal(key, SAVED_TREE_IDS_KEY)
      stored = value
    },
  }

  writeSavedTreeIds(storage, [1001, 1002, 1001])
  assert.equal(stored, '[1001,1002]')
  assert.deepEqual(readSavedTreeIds(storage), [1001, 1002])

  assert.deepEqual(
    readSavedTreeIds({
      getItem() {
        throw new Error('blocked')
      },
      setItem() {},
    }),
    [],
  )
})
