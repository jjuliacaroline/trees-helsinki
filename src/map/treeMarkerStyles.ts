import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec'
import type { FruitCategoryFilter } from '../data/treeClassifications'

export type TreeMapCategory = 'apple' | 'pear' | 'plum' | 'cherry' | 'other'
export type FruitClusterCategory = Exclude<TreeMapCategory, 'other'> | 'mixed'

export interface TreeMarkerStyle {
  label: string
  color: string
}

export const TREE_MARKER_STYLES: Record<TreeMapCategory, TreeMarkerStyle> = {
  apple: { label: 'Omena', color: '#d55e00' },
  pear: { label: 'Päärynä', color: '#0072b2' },
  plum: { label: 'Luumu', color: '#cc79a7' },
  cherry: { label: 'Kirsikka', color: '#e69f00' },
  other: { label: 'Muu puu', color: '#374151' },
}

export const TREE_MIXED_FRUIT_CLUSTER_COLOR = '#6b7280'

export const TREE_CATEGORY_COLOR_EXPRESSION: ExpressionSpecification = [
  'match',
  ['get', 'category'],
  'apple',
  TREE_MARKER_STYLES.apple.color,
  'pear',
  TREE_MARKER_STYLES.pear.color,
  'plum',
  TREE_MARKER_STYLES.plum.color,
  'cherry',
  TREE_MARKER_STYLES.cherry.color,
  TREE_MARKER_STYLES.other.color,
]

export const TREE_CLUSTER_PROPERTIES = {
  apple_count: ['+', ['case', ['==', ['get', 'category'], 'apple'], 1, 0]],
  pear_count: ['+', ['case', ['==', ['get', 'category'], 'pear'], 1, 0]],
  plum_count: ['+', ['case', ['==', ['get', 'category'], 'plum'], 1, 0]],
  cherry_count: ['+', ['case', ['==', ['get', 'category'], 'cherry'], 1, 0]],
} as Record<string, [unknown, unknown]>

export const TREE_DEFAULT_CLUSTER_COLOR_EXPRESSION: ExpressionSpecification = [
  'step',
  ['get', 'point_count'],
  '#4f8f5b',
  100,
  '#337447',
  750,
  '#1f5d36',
]

export interface FruitClusterComposition {
  pointCount: number
  appleCount: number
  pearCount: number
  plumCount: number
  cherryCount: number
}

export function getFruitClusterCategory(
  composition: FruitClusterComposition,
): FruitClusterCategory {
  const categories: Array<[FruitClusterCategory, number]> = [
    ['apple', composition.appleCount],
    ['pear', composition.pearCount],
    ['plum', composition.plumCount],
    ['cherry', composition.cherryCount],
  ]
  const matchingCategories = categories.filter(
    ([, count]) => count === composition.pointCount,
  )

  return matchingCategories.length === 1 ? matchingCategories[0][0] : 'mixed'
}

export function getTreeClusterColorExpression(
  fruitCategory: FruitCategoryFilter,
): string | ExpressionSpecification {
  switch (fruitCategory) {
    case 'apple':
    case 'pear':
    case 'plum':
    case 'cherry':
      return TREE_MARKER_STYLES[fruitCategory].color
    case 'edible':
      return [
        'case',
        ['==', ['get', 'apple_count'], ['get', 'point_count']],
        TREE_MARKER_STYLES.apple.color,
        ['==', ['get', 'pear_count'], ['get', 'point_count']],
        TREE_MARKER_STYLES.pear.color,
        ['==', ['get', 'plum_count'], ['get', 'point_count']],
        TREE_MARKER_STYLES.plum.color,
        ['==', ['get', 'cherry_count'], ['get', 'point_count']],
        TREE_MARKER_STYLES.cherry.color,
        TREE_MIXED_FRUIT_CLUSTER_COLOR,
      ]
    default:
      return TREE_DEFAULT_CLUSTER_COLOR_EXPRESSION
  }
}

export const TREE_MARKER_LEGEND_CATEGORIES: readonly TreeMapCategory[] = [
  'apple',
  'pear',
  'plum',
  'cherry',
  'other',
]
