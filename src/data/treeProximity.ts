import type { HelsinkiTreeFeature } from './treeRegistry'

export interface NearbyTree {
  tree: HelsinkiTreeFeature
  distanceMeters: number
}

const EARTH_RADIUS_METERS = 6_371_000

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function distanceMeters(
  from: readonly [number, number],
  to: readonly [number, number],
): number {
  const [fromLongitude, fromLatitude] = from
  const [toLongitude, toLatitude] = to
  const latitudeDelta = toRadians(toLatitude - fromLatitude)
  const longitudeDelta = toRadians(toLongitude - fromLongitude)
  const fromLatitudeRadians = toRadians(fromLatitude)
  const toLatitudeRadians = toRadians(toLatitude)

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitudeRadians) *
      Math.cos(toLatitudeRadians) *
      Math.sin(longitudeDelta / 2) ** 2

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine))
}

export function findNearestTrees(
  trees: readonly HelsinkiTreeFeature[],
  location: readonly [number, number],
  limit = 10,
): NearbyTree[] {
  if (limit <= 0) {
    return []
  }

  const nearest: NearbyTree[] = []

  for (const tree of trees) {
    if (!tree.geometry) {
      continue
    }

    const candidate = {
      tree,
      distanceMeters: distanceMeters(location, tree.geometry.coordinates),
    }

    const insertAt = nearest.findIndex(
      (nearby) => candidate.distanceMeters < nearby.distanceMeters,
    )

    if (insertAt === -1) {
      if (nearest.length < limit) {
        nearest.push(candidate)
      }
      continue
    }

    nearest.splice(insertAt, 0, candidate)
    if (nearest.length > limit) {
      nearest.pop()
    }
  }

  return nearest
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }

  return `${(meters / 1000).toLocaleString('fi-FI', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km`
}
