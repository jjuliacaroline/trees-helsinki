import type { HelsinkiTreeFeature } from './treeRegistry'

export type FruitClassificationId =
  | 'apple'
  | 'pear'
  | 'plum'
  | 'sweet-cherry'
  | 'sour-cherry'

export type FruitCategoryFilter = '' | 'edible' | 'apple' | 'pear' | 'plum' | 'cherry'

export interface FruitClassification {
  id: FruitClassificationId
  label: string
}

export const FRUIT_CATEGORY_OPTIONS: ReadonlyArray<{
  value: Exclude<FruitCategoryFilter, ''>
  label: string
}> = [
  { value: 'edible', label: 'Syötävät hedelmäpuut' },
  { value: 'apple', label: 'Omena' },
  { value: 'pear', label: 'Päärynä' },
  { value: 'plum', label: 'Luumu' },
  { value: 'cherry', label: 'Kirsikka' },
]

const FRUIT_RULES: Readonly<Record<string, FruitClassification>> = {
  'malus domestica': { id: 'apple', label: 'Omena' },
  'pyrus communis': { id: 'pear', label: 'Päärynä' },
  'prunus domestica': { id: 'plum', label: 'Luumu' },
  'prunus avium': { id: 'sweet-cherry', label: 'Makeakirsikka' },
  'prunus cerasus': { id: 'sour-cherry', label: 'Hapankirsikka' },
}

function normalizedTaxon(value: string): string {
  return value.trim().toLocaleLowerCase('fi-FI')
}

export function classifyTree(tree: HelsinkiTreeFeature): FruitClassification | null {
  const { suku, laji } = tree.properties
  if (!suku || !laji) {
    return null
  }

  return FRUIT_RULES[`${normalizedTaxon(suku)} ${normalizedTaxon(laji)}`] ?? null
}

export function matchesFruitCategory(
  tree: HelsinkiTreeFeature,
  category: FruitCategoryFilter,
): boolean {
  if (!category) {
    return true
  }

  const classification = classifyTree(tree)
  if (!classification) {
    return false
  }

  if (category === 'edible') {
    return true
  }

  if (category === 'cherry') {
    return classification.id === 'sweet-cherry' || classification.id === 'sour-cherry'
  }

  return classification.id === category
}
