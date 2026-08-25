import type { HelsinkiTreeFeature } from './treeRegistry'

export interface TreeSnapshotMetadata {
  generatedAt: string
  sourceUpdatedAt: string | null
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('tree snapshot metadata must be an object')
  }

  return value as Record<string, unknown>
}

function readDateString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${field} must be a valid date string`)
  }

  return value
}

export function normalizeTreeSnapshotMetadata(value: unknown): TreeSnapshotMetadata {
  const metadata = asRecord(value)
  const sourceUpdatedAt = metadata.sourceUpdatedAt

  if (
    sourceUpdatedAt !== null &&
    sourceUpdatedAt !== undefined &&
    (typeof sourceUpdatedAt !== 'string' || !Number.isFinite(Date.parse(sourceUpdatedAt)))
  ) {
    throw new Error('sourceUpdatedAt must be a valid date string or null')
  }

  return {
    generatedAt: readDateString(metadata.generatedAt, 'generatedAt'),
    sourceUpdatedAt: typeof sourceUpdatedAt === 'string' ? sourceUpdatedAt : null,
  }
}

export function latestSourceUpdatedAt(
  features: readonly HelsinkiTreeFeature[],
): string | null {
  let latestValue: string | null = null
  let latestTimestamp = Number.NEGATIVE_INFINITY

  for (const feature of features) {
    const value = feature.properties.paivitetty_tietopalveluun
    if (!value) continue

    const timestamp = Date.parse(value)
    if (!Number.isFinite(timestamp) || timestamp <= latestTimestamp) continue

    latestTimestamp = timestamp
    latestValue = value
  }

  return latestValue
}
