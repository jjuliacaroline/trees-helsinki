import type { GeoJsonPoint, HelsinkiTreeFeature } from '../data/treeRegistry'

export interface TreeMapFeature {
  type: 'Feature'
  id: number
  properties: Record<string, never>
  geometry: GeoJsonPoint
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
        properties: {},
        geometry: tree.geometry,
      },
    ]
  })
}
