export const SAVED_TREE_IDS_KEY = 'trees-helsinki.saved-tree-ids.v1'

export interface SavedTreeStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function normalizeSavedTreeIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return []
  }

  return [
    ...new Set(
      value.filter(
        (treeId): treeId is number =>
          typeof treeId === 'number' && Number.isInteger(treeId) && treeId >= 0,
      ),
    ),
  ]
}

export function parseSavedTreeIds(rawValue: string | null): number[] {
  if (rawValue === null) {
    return []
  }

  try {
    return normalizeSavedTreeIds(JSON.parse(rawValue))
  } catch {
    return []
  }
}

export function readSavedTreeIds(storage: SavedTreeStorage): number[] {
  try {
    return parseSavedTreeIds(storage.getItem(SAVED_TREE_IDS_KEY))
  } catch {
    return []
  }
}

export function writeSavedTreeIds(storage: SavedTreeStorage, treeIds: readonly number[]): void {
  storage.setItem(SAVED_TREE_IDS_KEY, JSON.stringify(normalizeSavedTreeIds(treeIds)))
}

export function toggleSavedTreeId(treeIds: readonly number[], treeId: number): number[] {
  if (treeIds.includes(treeId)) {
    return treeIds.filter((savedTreeId) => savedTreeId !== treeId)
  }

  return [...treeIds, treeId]
}
