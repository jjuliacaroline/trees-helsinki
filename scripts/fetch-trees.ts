import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Agent } from 'undici'
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
const REQUEST_TIMEOUT_MS = 60_000
const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000] as const
const WFS_AGENT = new Agent({ connect: { timeout: REQUEST_TIMEOUT_MS } })
const OUTPUT_PATH = resolve(process.cwd(), 'public/data/trees.geojson')
const METADATA_OUTPUT_PATH = resolve(
  process.cwd(),
  'public/data/generated/tree-metadata.json',
)

const TRANSIENT_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])

type FetchPageOptions = {
  fetchImpl?: typeof fetch
  requestTimeoutMs?: number
  sleep?: (delayMs: number) => Promise<void>
}

export function formatFetchError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error)
  }

  const cause = error.cause
  const directCode = (error as { code?: unknown }).code
  const causeCode = cause && typeof cause === 'object'
    ? (cause as { code?: unknown }).code
    : undefined
  const code = typeof directCode === 'string'
    ? directCode
    : typeof causeCode === 'string'
      ? causeCode
      : undefined
  const causeText = cause instanceof Error ? `; cause: ${cause.message}` : ''
  const codeText = code ? ` (code=${code})` : ''
  return `${error.name}: ${error.message}${codeText}${causeText}`
}

function isTransientNetworkError(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof Error && error.name === 'TimeoutError')
}

function defaultSleep(delayMs: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, delayMs))
}

async function fetchResponseWithRetries(
  url: URL,
  options: FetchPageOptions,
): Promise<Response> {
  const sleep = options.sleep ?? defaultSleep
  const maxAttempts = MAX_RETRIES + 1

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let retryableHttpFailure = false

    try {
      const requestInit = {
        headers: {
          accept: 'application/json',
        },
        dispatcher: WFS_AGENT,
        signal: AbortSignal.timeout(options.requestTimeoutMs ?? REQUEST_TIMEOUT_MS),
      } as RequestInit & { dispatcher: Agent }
      const response = await (options.fetchImpl ?? fetch)(url, requestInit)

      if (!response.ok && TRANSIENT_HTTP_STATUSES.has(response.status)) {
        retryableHttpFailure = true
        throw new Error(`Helsinki WFS request failed with HTTP ${response.status}`)
      }

      return response
    } catch (error) {
      const canRetry = retryableHttpFailure || isTransientNetworkError(error)

      if (!canRetry || attempt === maxAttempts) {
        throw error
      }

      const delayMs = RETRY_DELAYS_MS[attempt - 1]
      console.warn(
        `Helsinki WFS request attempt ${attempt}/${maxAttempts} failed: ${formatFetchError(error)}. Retrying in ${delayMs} ms.`,
      )
      await sleep(delayMs)
    }
  }

  throw new Error('Helsinki WFS request retry loop ended unexpectedly')
}

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

export async function fetchPage(
  startIndex: number,
  options: FetchPageOptions = {},
): Promise<HelsinkiTreeFeatureCollection> {
  const response = await fetchResponseWithRetries(buildPageUrl(startIndex), options)

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

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(formatFetchError(error))
    process.exitCode = 1
  })
}
