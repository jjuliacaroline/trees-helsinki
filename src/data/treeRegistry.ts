export interface GeoJsonPoint {
  type: 'Point'
  coordinates: [number, number]
}

export interface HelsinkiTreeProperties {
  id: number
  tunnus: string | null
  kadunnimi: string | null
  puistonnimi: string | null
  paatyyppi: string | null
  suomenknimi: string | null
  suku: string | null
  laji: string | null
  kokoluokka: string | null
  istutusvuosi: number | null
  datanomistaja: string | null
  paivitetty_tietopalveluun: string | null
}

export interface HelsinkiTreeFeature {
  type: 'Feature'
  properties: HelsinkiTreeProperties
  geometry: GeoJsonPoint | null
}

export interface HelsinkiTreeFeatureCollection {
  type: 'FeatureCollection'
  features: HelsinkiTreeFeature[]
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }

  return value as Record<string, unknown>
}

function readInteger(record: Record<string, unknown>, key: string): number {
  const value = record[key]

  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`${key} must be an integer`)
  }

  return value
}

function readNullableInteger(record: Record<string, unknown>, key: string): number | null {
  const value = record[key]

  if (value === null || value === undefined) {
    return null
  }

  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`${key} must be an integer or null`)
  }

  return value
}

function readNullableString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]

  if (value === null || value === undefined) {
    return null
  }

  if (typeof value !== 'string') {
    throw new Error(`${key} must be a string or null`)
  }

  return value
}

function normalizeGeometry(value: unknown): GeoJsonPoint | null {
  if (value === null || value === undefined) {
    return null
  }

  const geometry = asRecord(value, 'geometry')

  if (geometry.type !== 'Point') {
    throw new Error('geometry.type must be Point')
  }

  if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) {
    throw new Error('geometry.coordinates must contain longitude and latitude')
  }

  const [longitude, latitude] = geometry.coordinates

  if (
    typeof longitude !== 'number' ||
    typeof latitude !== 'number' ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error('geometry coordinates must be valid WGS84 longitude/latitude values')
  }

  return {
    type: 'Point',
    coordinates: [longitude, latitude],
  }
}

export function normalizeTreeFeature(value: unknown): HelsinkiTreeFeature {
  const feature = asRecord(value, 'feature')

  if (feature.type !== 'Feature') {
    throw new Error('feature.type must be Feature')
  }

  const properties = asRecord(feature.properties, 'feature.properties')

  return {
    type: 'Feature',
    properties: {
      id: readInteger(properties, 'id'),
      tunnus: readNullableString(properties, 'tunnus'),
      kadunnimi: readNullableString(properties, 'kadunnimi'),
      puistonnimi: readNullableString(properties, 'puistonnimi'),
      paatyyppi: readNullableString(properties, 'paatyyppi'),
      suomenknimi: readNullableString(properties, 'suomenknimi'),
      suku: readNullableString(properties, 'suku'),
      laji: readNullableString(properties, 'laji'),
      kokoluokka: readNullableString(properties, 'kokoluokka'),
      istutusvuosi: readNullableInteger(properties, 'istutusvuosi'),
      datanomistaja: readNullableString(properties, 'datanomistaja'),
      paivitetty_tietopalveluun: readNullableString(properties, 'paivitetty_tietopalveluun'),
    },
    geometry: normalizeGeometry(feature.geometry),
  }
}

export function normalizeTreeFeatureCollection(value: unknown): HelsinkiTreeFeatureCollection {
  const collection = asRecord(value, 'feature collection')

  if (collection.type !== 'FeatureCollection') {
    throw new Error('response must be a GeoJSON FeatureCollection')
  }

  if (!Array.isArray(collection.features)) {
    throw new Error('FeatureCollection.features must be an array')
  }

  return {
    type: 'FeatureCollection',
    features: collection.features.map(normalizeTreeFeature),
  }
}

export function hasRepresentativeHelsinkiCoordinate(
  collection: HelsinkiTreeFeatureCollection,
): boolean {
  return collection.features.some((feature) => {
    if (!feature.geometry) {
      return false
    }

    const [longitude, latitude] = feature.geometry.coordinates
    return longitude >= 24.7 && longitude <= 25.3 && latitude >= 60.1 && latitude <= 60.4
  })
}

export function sortTreeFeatures(
  features: readonly HelsinkiTreeFeature[],
): HelsinkiTreeFeature[] {
  return [...features].sort((left, right) => left.properties.id - right.properties.id)
}
