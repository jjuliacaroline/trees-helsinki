import { useEffect, useMemo, useRef, useState } from 'react'
import { Map, NavigationControl, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import {
  buildTreeFilterOptions,
  buildTreeSearchIndex,
  EMPTY_TREE_FILTERS,
  filterTrees,
  type TreeFilters,
} from '../data/treeFiltering'
import {
  normalizeTreeFeatureCollection,
  type HelsinkiTreeFeature,
} from '../data/treeRegistry'
import { TreeDetailsPanel } from './TreeDetailsPanel'
import { TreeFilterPanel } from './TreeFilterPanel'
import { projectTreesForMap } from './treeMapData'

setWorkerUrl(maplibreWorkerUrl)

const HELSINKI_CENTER: [number, number] = [24.9384, 60.1699]
const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const TREE_DATA_URL = `${import.meta.env.BASE_URL}data/trees.geojson`
const TREE_SOURCE_ID = 'trees'
const CLUSTER_LAYER_ID = 'tree-clusters'
const CLUSTER_COUNT_LAYER_ID = 'tree-cluster-count'
const TREE_LAYER_ID = 'tree-points'

export function HelsinkiMap() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [allTrees, setAllTrees] = useState<HelsinkiTreeFeature[]>([])
  const [filters, setFilters] = useState<TreeFilters>({ ...EMPTY_TREE_FILTERS })
  const [selectedTree, setSelectedTree] = useState<HelsinkiTreeFeature | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [effectiveSearch, setEffectiveSearch] = useState(filters.search)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setEffectiveSearch(filters.search)
    }, 200)

    return () => window.clearTimeout(timeoutId)
  }, [filters.search])

  const effectiveFilters = useMemo(
    () => ({
      search: effectiveSearch,
      fruitCategory: filters.fruitCategory,
      genus: filters.genus,
      species: filters.species,
      mainType: filters.mainType,
      plantingYear: filters.plantingYear,
      sizeClass: filters.sizeClass,
    }),
    [
      effectiveSearch,
      filters.fruitCategory,
      filters.genus,
      filters.species,
      filters.mainType,
      filters.plantingYear,
      filters.sizeClass,
    ],
  )
  const treeSearchIndex = useMemo(() => buildTreeSearchIndex(allTrees), [allTrees])
  const filteredTrees = useMemo(
    () => filterTrees(allTrees, effectiveFilters, treeSearchIndex),
    [allTrees, effectiveFilters, treeSearchIndex],
  )
  const mapFeatures = useMemo(() => projectTreesForMap(filteredTrees), [filteredTrees])
  const treesById = useMemo(
    () => new globalThis.Map(allTrees.map((tree) => [tree.properties.id, tree] as const)),
    [allTrees],
  )
  const treesByIdRef = useRef(treesById)

  useEffect(() => {
    treesByIdRef.current = treesById
  }, [treesById])

  const filterOptions = useMemo(
    () => buildTreeFilterOptions(allTrees, filters.genus, filters.fruitCategory),
    [allTrees, filters.genus, filters.fruitCategory],
  )

  useEffect(() => {
    const controller = new AbortController()

    async function loadTrees() {
      try {
        setLoading(true)
        setLoadError(null)

        const response = await fetch(TREE_DATA_URL, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`tree data request failed with status ${response.status}`)
        }

        const collection = normalizeTreeFeatureCollection(await response.json())
        setAllTrees(collection.features)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        console.error('Could not load tree registry data', error)
        setLoadError('Puutietoja ei voitu ladata.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadTrees()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    setMapReady(false)

    const map = new Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center: HELSINKI_CENTER,
      zoom: 11.5,
    })
    mapRef.current = map

    map.addControl(new NavigationControl(), 'top-right')

    map.on('load', () => {
      map.addSource(TREE_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      })

      map.addLayer({
        id: CLUSTER_LAYER_ID,
        type: 'circle',
        source: TREE_SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#4f8f5b',
            100,
            '#337447',
            750,
            '#1f5d36',
          ],
          'circle-radius': ['step', ['get', 'point_count'], 18, 100, 24, 750, 30],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      })

      map.addLayer({
        id: CLUSTER_COUNT_LAYER_ID,
        type: 'symbol',
        source: TREE_SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#ffffff',
        },
      })

      map.addLayer({
        id: TREE_LAYER_ID,
        type: 'circle',
        source: TREE_SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#2f7d4a',
          'circle-radius': 5,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
        },
      })

      setMapReady(true)
    })

    map.on('click', CLUSTER_LAYER_ID, async (event) => {
      const cluster = event.features?.[0]
      const clusterId = cluster?.properties?.cluster_id

      if (typeof clusterId !== 'number' || !cluster) {
        return
      }

      const source = map.getSource(TREE_SOURCE_ID) as GeoJSONSource | undefined
      if (!source) {
        return
      }

      const zoom = await source.getClusterExpansionZoom(clusterId)
      if (cluster.geometry.type !== 'Point') {
        return
      }

      map.easeTo({
        center: cluster.geometry.coordinates as [number, number],
        zoom,
      })
    })

    map.on('click', TREE_LAYER_ID, (event) => {
      const feature = event.features?.[0]
      if (!feature || typeof feature.id !== 'number') {
        return
      }

      const tree = treesByIdRef.current.get(feature.id)
      if (tree) {
        setSelectedTree(tree)
      }
    })

    const showPointer = () => {
      map.getCanvas().style.cursor = 'pointer'
    }
    const resetPointer = () => {
      map.getCanvas().style.cursor = ''
    }

    map.on('mouseenter', CLUSTER_LAYER_ID, showPointer)
    map.on('mouseleave', CLUSTER_LAYER_ID, resetPointer)
    map.on('mouseenter', TREE_LAYER_ID, showPointer)
    map.on('mouseleave', TREE_LAYER_ID, resetPointer)

    return () => {
      mapRef.current = null
      map.remove()
    }
  }, [])

  useEffect(() => {
    if (!mapReady) {
      return
    }

    const source = mapRef.current?.getSource(TREE_SOURCE_ID) as GeoJSONSource | undefined
    if (!source) {
      return
    }

    const data = {
      type: 'FeatureCollection',
      features: mapFeatures,
    } as Parameters<GeoJSONSource['setData']>[0]

    source.setData(data)
  }, [mapFeatures, mapReady])

  useEffect(() => {
    if (
      selectedTree &&
      !filteredTrees.some((tree) => tree.properties.id === selectedTree.properties.id)
    ) {
      setSelectedTree(null)
    }
  }, [filteredTrees, selectedTree])

  return (
    <div className="map-shell">
      <div ref={containerRef} className="map" aria-label="Interactive map of Helsinki trees" />
      <TreeFilterPanel
        filters={filters}
        options={filterOptions}
        resultCount={filteredTrees.length}
        loading={loading}
        error={loadError}
        onChange={setFilters}
        onReset={() => setFilters({ ...EMPTY_TREE_FILTERS })}
      />
      {selectedTree ? (
        <TreeDetailsPanel tree={selectedTree} onClose={() => setSelectedTree(null)} />
      ) : null}
    </div>
  )
}
