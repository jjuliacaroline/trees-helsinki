import { classifyTree } from '../data/treeClassifications'
import type { GeoJsonPoint, HelsinkiTreeFeature } from '../data/treeRegistry'
import type { TreeMapCategory } from './treeMarkerStyles'

export interface TreeMapFeature {
  type: 'Feature'
  id: number
  properties: {
    category: TreeMapCategory
  }
  geometry: GeoJsonPoint
}

export interface TreeHighlightFeature {
  type: 'Feature'
  id: number
  properties: {
    category: TreeMapCategory
    selected: boolean
  }
  geometry: GeoJsonPoint
}

export function getTreeMapCategory(tree: HelsinkiTreeFeature): TreeMapCategory {
  const classification = classifyTree(tree)

  switch (classification?.id) {
    case 'apple':
    case 'pear':
    case 'plum':
      return classification.id
    case 'sweet-cherry':
    case 'sour-cherry':
      return 'cherry'
    default:
      return 'other'
  }
}

export function projectTreesForMap(
  trees: readonly HelsinkiTreeFeature[],
): TreeMapFeature[] {
  return trees.flatMap((tree) => {
    if (!tree.geometry) {
      return []
    }

    return [
      {
        type: 'Feature',
        id: tree.properties.id,
        properties: {
          category: getTreeMapCategory(tree),
        },
        geometry: tree.geometry,
      },
    ]
  })
}

export function projectTreeHighlightsForMap(
  trees: readonly HelsinkiTreeFeature[],
  selectedTreeId: number | null,
): TreeHighlightFeature[] {
  if (selectedTreeId === null) {
    return []
  }

  return trees.flatMap((tree) => {
    if (!tree.geometry || tree.properties.id !== selectedTreeId) {
      return []
    }

    const category = getTreeMapCategory(tree)

    return [
      {
        type: 'Feature',
        id: tree.properties.id,
        properties: { category, selected: true },
        geometry: tree.geometry,
      },
    ]
  })
}
