export type TreeMapCategory = 'apple' | 'pear' | 'plum' | 'cherry' | 'other'

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

export const TREE_MARKER_LEGEND_CATEGORIES: readonly TreeMapCategory[] = [
  'apple',
  'pear',
  'plum',
  'cherry',
  'other',
]
