import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { latestSourceUpdatedAt, type TreeSnapshotMetadata } from '../src/data/treeSnapshotMetadata'
import {
  hasRepresentativeHelsinkiCoordinate,
  normalizeTreeFeatureCollection,
  sortTreeFeatures,
  type HelsinkiTreeFeature,
  type HelsinkiTreeFeatureCollection,
} from '../src/data/treeRegistry'

const WFS_ENDPOINT = 'https://kartta.hel.fi/ws/geoserver/avoindata/wfs'
const LAYER_NAME = 'avoindata:Puurekisteri_piste'
const PAGE_SIZE = 5000
const OUTPUT_PATH = resolve(process.cwd(), 'public/data/trees.geojson')
const METADATA_OUTPUT_PATH = resolve(
  process.cwd(),
  'public/data/generated/tree-metadata.json',
)

function buildPageUrl(startIndex: number): URL {
  const url = new URL(WFS_ENDPOINT)
  url.searchParams.set('service', 'WFS')
  url.searchParams.set('version', '2.0.0')
  url.searchParams.set('request', 'GetFeature')
  url.searchParams.set('typeNames', LAYER_NAME)
  url.searchParams.set('outputFormat', 'application/json')
  url.searchParams.set('srsName', 'EPSG:4326')
  url.searchParams.set('count', String(PAGE_SIZE))
  url.searchParams.set('startIndex', String(startIndex))
  url.searchParams.set('sortBy', 'id')
  return url
}

async function fetchPage(startIndex: number): Promise<HelsinkiTreeFeatureCollection> {
  const response = await fetch(buildPageUrl(startIndex), {
    headers: {
      accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Helsinki WFS request failed with HTTP ${response.status}`)
  }

  const payload: unknown = await response.json()
  return normalizeTreeFeatureCollection(payload)
}

async function fetchAllTrees(): Promise<HelsinkiTreeFeatureCollection> {
  const features: HelsinkiTreeFeature[] = []
  const seenIds = new Set<number>()
  let startIndex = 0

  while (true) {
    const page = await fetchPage(startIndex)

    if (page.features.length === 0) {
      break
    }

    for (const feature of page.features) {
      const id = feature.properties.id

      if (seenIds.has(id)) {
        throw new Error(`Duplicate tree id ${id} encountered while paging WFS results`)
      }

      seenIds.add(id)
      features.push(feature)
    }

    startIndex += page.features.length
  }

  if (features.length === 0) {
    throw new Error('Helsinki WFS returned no tree features')
  }

  const collection: HelsinkiTreeFeatureCollection = {
    type: 'FeatureCollection',
    features: sortTreeFeatures(features),
  }

  if (!hasRepresentativeHelsinkiCoordinate(collection)) {
    throw new Error(
      'Tree data does not contain representative Helsinki WGS84 coordinates; check WFS reprojection and coordinate order',
    )
  }

  return collection
}

async function main(): Promise<void> {
  const collection = await fetchAllTrees()
  const metadata: TreeSnapshotMetadata = {
    generatedAt: new Date().toISOString(),
    sourceUpdatedAt: latestSourceUpdatedAt(collection.features),
  }

  await mkdir(resolve(process.cwd(), 'public/data/generated'), { recursive: true })
  await writeFile(OUTPUT_PATH, `${JSON.stringify(collection, null, 2)}\n`, 'utf8')
  await writeFile(
    METADATA_OUTPUT_PATH,
    `${JSON.stringify(metadata, null, 2)}\n`,
    'utf8',
  )
  console.log(`Wrote ${collection.features.length} trees to ${OUTPUT_PATH}`)
  console.log(`Wrote tree snapshot metadata to ${METADATA_OUTPUT_PATH}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
