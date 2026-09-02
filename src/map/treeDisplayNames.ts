import type { HelsinkiTreeProperties } from '../data/treeRegistry'

const TECHNICAL_PLACEHOLDER_LABEL = 'Tunnistamaton lehtipuu'
const TECHNICAL_PLACEHOLDER_KEYS = new Set(['TUNNISTAMATONLEHTI'])

function technicalPlaceholderKey(value: string): string {
  return value.trim().replace(/\s+/gu, '').toLocaleUpperCase('fi-FI')
}

function isTechnicalPlaceholder(value: string | null): boolean {
  return value !== null && TECHNICAL_PLACEHOLDER_KEYS.has(technicalPlaceholderKey(value))
}

export function readableCommonName(value: string | null): string | null {
  if (value === null) return null

  const trimmed = value.trim()
  if (trimmed === '') return null
  if (isTechnicalPlaceholder(trimmed)) return TECHNICAL_PLACEHOLDER_LABEL
  if (trimmed !== trimmed.toLocaleUpperCase('fi-FI')) return trimmed

  const lowerCased = trimmed.toLocaleLowerCase('fi-FI')
  return lowerCased.replace(
    /(^|[\s/-])(\p{L})/gu,
    (_match, separator: string, letter: string) => `${separator}${letter.toLocaleUpperCase('fi-FI')}`,
  )
}

export function readableScientificName(
  properties: Pick<HelsinkiTreeProperties, 'suku' | 'laji'>,
): string | null {
  const parts = [properties.suku, properties.laji].filter(
    (value): value is string => Boolean(value),
  )

  if (parts.some((value) => isTechnicalPlaceholder(value))) return null
  return parts.length > 0 ? parts.join(' ') : null
}
