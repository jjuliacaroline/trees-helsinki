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
import { distanceMeters, findNearestTrees } from '../data/treeProximity'
import {
  readSavedTreeIds,
  toggleSavedTreeId,
  writeSavedTreeIds,
} from '../data/savedTrees'
import {
  normalizeTreeFeatureCollection,
  type HelsinkiTreeFeature,
} from '../data/treeRegistry'
import { MobileFilterSheet } from './MobileFilterSheet'
import { MobileMapControls } from './MobileMapControls'
import { MobileTreeDetailsSheet } from './MobileTreeDetailsSheet'
import { TreeDataInfo } from './TreeDataInfo'
import { TreeDetailsPanel } from './TreeDetailsPanel'
import {
  TreeFilterPanel,
  type LocationStatus,
  type TreeViewMode,
} from './TreeFilterPanel'
import {
  projectTreeHighlightsForMap,
  projectTreesForMap,
} from './treeMapData'
import {
  getTreeClusterColorExpression,
  TREE_CATEGORY_COLOR_EXPRESSION,
  TREE_CLUSTER_PROPERTIES,
  TREE_DEFAULT_CLUSTER_COLOR_EXPRESSION,
} from './treeMarkerStyles'

setWorkerUrl(maplibreWorkerUrl)

const HELSINKI_CENTER: [number, number] = [24.9384, 60.1699]
const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const TREE_DATA_URL = `${import.meta.env.BASE_URL}data/trees.geojson`
const TREE_SOURCE_ID = 'trees'
const TREE_HIGHLIGHT_SOURCE_ID = 'tree-highlights'
const USER_LOCATION_SOURCE_ID = 'user-location'
const CLUSTER_LAYER_ID = 'tree-clusters'
const CLUSTER_COUNT_LAYER_ID = 'tree-cluster-count'
const SELECTED_TREE_LAYER_ID = 'selected-tree-highlight'
const TREE_LAYER_ID = 'tree-points'
const USER_LOCATION_LAYER_ID = 'user-location-point'
const MOBILE_BREAKPOINT_QUERY = '(max-width: 760px)'
const MOBILE_SELECTED_SHEET_MAX_HEIGHT = 430

function countActiveFilters(filters: TreeFilters): number {
  return [
    filters.fruitCategory,
    filters.genus,
    filters.species,
    filters.mainType,
    filters.plantingYearFrom !== null || filters.plantingYearTo !== null ? 'planting-year' : '',
    filters.sizeClass,
  ].filter((value) => value !== '').length
}

export function HelsinkiMap() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [allTrees, setAllTrees] = useState<HelsinkiTreeFeature[]>([])
  const [filters, setFilters] = useState<TreeFilters>({ ...EMPTY_TREE_FILTERS })
  const [selectedTree, setSelectedTree] = useState<HelsinkiTreeFeature | null>(null)
  const [viewMode, setViewMode] = useState<TreeViewMode>('browse')
  const [savedTreeIds, setSavedTreeIds] = useState<number[]>([])
  const [savedTreesLoaded, setSavedTreesLoaded] = useState(false)
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle')
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [effectiveSearch, setEffectiveSearch] = useState(filters.search)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setEffectiveSearch(filters.search), 200)
    return () => window.clearTimeout(timeoutId)
  }, [filters.search])

  useEffect(() => {
    setSavedTreeIds(readSavedTreeIds(window.localStorage))
    setSavedTreesLoaded(true)
  }, [])

  useEffect(() => {
    if (!savedTreesLoaded) return
    try {
      writeSavedTreeIds(window.localStorage, savedTreeIds)
    } catch {
      // Browser storage may be unavailable; saving remains best-effort and map use continues.
    }
  }, [savedTreeIds, savedTreesLoaded])

  const effectiveFilters = useMemo(() => ({
    search: effectiveSearch,
    fruitCategory: filters.fruitCategory,
    genus: filters.genus,
    species: filters.species,
    mainType: filters.mainType,
    plantingYearFrom: filters.plantingYearFrom,
    plantingYearTo: filters.plantingYearTo,
    sizeClass: filters.sizeClass,
  }), [effectiveSearch, filters.fruitCategory, filters.genus, filters.species, filters.mainType, filters.plantingYearFrom, filters.plantingYearTo, filters.sizeClass])

  const treeSearchIndex = useMemo(() => buildTreeSearchIndex(allTrees), [allTrees])
  const filteredTrees = useMemo(() => filterTrees(allTrees, effectiveFilters, treeSearchIndex), [allTrees, effectiveFilters, treeSearchIndex])
  const treesById = useMemo(() => new globalThis.Map(allTrees.map((tree) => [tree.properties.id, tree] as const)), [allTrees])
  const savedTrees = useMemo(() => savedTreeIds.map((id) => treesById.get(id)).filter((tree): tree is HelsinkiTreeFeature => Boolean(tree)), [savedTreeIds, treesById])
  const displayedTrees = viewMode === 'saved' ? savedTrees : filteredTrees
  const mapFeatures = useMemo(() => projectTreesForMap(displayedTrees), [displayedTrees])
  const visibleSelectedTree = useMemo(() => selectedTree && displayedTrees.some((tree) => tree.properties.id === selectedTree.properties.id) ? selectedTree : null, [displayedTrees, selectedTree])
  const highlightFeatures = useMemo(() => projectTreeHighlightsForMap(visibleSelectedTree ? [visibleSelectedTree] : [], visibleSelectedTree?.properties.id ?? null), [visibleSelectedTree])
  const nearbyTrees = useMemo(() => userLocation && viewMode === 'browse' ? findNearestTrees(filteredTrees, userLocation, 5) : [], [filteredTrees, userLocation, viewMode])
  const selectedTreeDistance = useMemo(() => userLocation && visibleSelectedTree?.geometry ? distanceMeters(userLocation, visibleSelectedTree.geometry.coordinates) : undefined, [userLocation, visibleSelectedTree])
  const filterOptions = useMemo(() => buildTreeFilterOptions(allTrees, filters.genus, filters.fruitCategory), [allTrees, filters.genus, filters.fruitCategory])
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters])
  const treesByIdRef = useRef(treesById)

  useEffect(() => { treesByIdRef.current = treesById }, [treesById])

  useEffect(() => {
    const controller = new AbortController()
    async function loadTrees() {
      try {
        setLoading(true)
        setLoadError(null)
        const response = await fetch(TREE_DATA_URL, { signal: controller.signal })
        if (!response.ok) throw new Error(`tree data request failed with status ${response.status}`)
        const collection = normalizeTreeFeatureCollection(await response.json())
        setAllTrees(collection.features)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        console.error('Could not load tree registry data', error)
        setLoadError('Puutietoja ei voitu ladata.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void loadTrees()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    setMapReady(false)
    const map = new Map({ container: containerRef.current, style: OPENFREEMAP_STYLE, center: HELSINKI_CENTER, zoom: 11.5 })
    mapRef.current = map
    map.addControl(new NavigationControl(), 'top-right')

    map.on('load', () => {
      map.addSource(TREE_SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterMaxZoom: 14, clusterRadius: 50, clusterProperties: TREE_CLUSTER_PROPERTIES })
      map.addSource(TREE_HIGHLIGHT_SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addSource(USER_LOCATION_SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({ id: CLUSTER_LAYER_ID, type: 'circle', source: TREE_SOURCE_ID, filter: ['has', 'point_count'], paint: { 'circle-color': TREE_DEFAULT_CLUSTER_COLOR_EXPRESSION, 'circle-radius': ['step', ['get', 'point_count'], 18, 100, 24, 750, 30], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } })
      map.addLayer({ id: CLUSTER_COUNT_LAYER_ID, type: 'symbol', source: TREE_SOURCE_ID, filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }, paint: { 'text-color': '#ffffff' } })
      map.addLayer({ id: TREE_LAYER_ID, type: 'circle', source: TREE_SOURCE_ID, filter: ['!', ['has', 'point_count']], paint: { 'circle-color': TREE_CATEGORY_COLOR_EXPRESSION, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 6, 18, 8], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } })
      map.addLayer({ id: SELECTED_TREE_LAYER_ID, type: 'circle', source: TREE_HIGHLIGHT_SOURCE_ID, filter: ['==', ['get', 'selected'], true], paint: { 'circle-color': '#1f8f46', 'circle-opacity': 1, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 11, 18, 15], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3.5 } })
      map.addLayer({ id: USER_LOCATION_LAYER_ID, type: 'circle', source: USER_LOCATION_SOURCE_ID, paint: { 'circle-color': '#2563eb', 'circle-radius': 8, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 } })
      setMapReady(true)
    })

    map.on('click', CLUSTER_LAYER_ID, async (event) => {
      const cluster = event.features?.[0]
      const clusterId = cluster?.properties?.cluster_id
      if (typeof clusterId !== 'number' || !cluster) return
      const source = map.getSource(TREE_SOURCE_ID) as GeoJSONSource | undefined
      if (!source) return
      const zoom = await source.getClusterExpansionZoom(clusterId)
      if (cluster.geometry.type !== 'Point') return
      map.easeTo({ center: cluster.geometry.coordinates as [number, number], zoom })
    })

    map.on('click', TREE_LAYER_ID, (event) => {
      const featureId = event.features?.[0]?.id
      if (typeof featureId !== 'number') return
      const tree = treesByIdRef.current.get(featureId)
      if (tree) setSelectedTree(tree)
    })

    const showPointer = () => { map.getCanvas().style.cursor = 'pointer' }
    const resetPointer = () => { map.getCanvas().style.cursor = '' }
    map.on('mouseenter', CLUSTER_LAYER_ID, showPointer)
    map.on('mouseleave', CLUSTER_LAYER_ID, resetPointer)
    map.on('mouseenter', TREE_LAYER_ID, showPointer)
    map.on('mouseleave', TREE_LAYER_ID, resetPointer)

    return () => { mapRef.current = null; map.remove() }
  }, [])

  useEffect(() => {
    if (!mapReady) return
    const source = mapRef.current?.getSource(TREE_SOURCE_ID) as GeoJSONSource | undefined
    source?.setData({ type: 'FeatureCollection', features: mapFeatures } as Parameters<GeoJSONSource['setData']>[0])
  }, [mapFeatures, mapReady])

  useEffect(() => {
    if (!mapReady) return
    const source = mapRef.current?.getSource(TREE_HIGHLIGHT_SOURCE_ID) as GeoJSONSource | undefined
    source?.setData({ type: 'FeatureCollection', features: highlightFeatures } as Parameters<GeoJSONSource['setData']>[0])
  }, [highlightFeatures, mapReady])

  useEffect(() => {
    if (!mapReady) return
    const source = mapRef.current?.getSource(USER_LOCATION_SOURCE_ID) as GeoJSONSource | undefined
    source?.setData({
      type: 'FeatureCollection',
      features: userLocation ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: userLocation } }] : [],
    } as Parameters<GeoJSONSource['setData']>[0])
    if (userLocation && !(visibleSelectedTree && window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches)) {
      mapRef.current?.easeTo({ center: userLocation, zoom: Math.max(mapRef.current?.getZoom() ?? 14, 14) })
    }
  }, [mapReady, userLocation])

  useEffect(() => {
    if (!mapReady) return
    mapRef.current?.setPaintProperty(CLUSTER_LAYER_ID, 'circle-color', getTreeClusterColorExpression(viewMode === 'browse' ? filters.fruitCategory : ''))
  }, [filters.fruitCategory, mapReady, viewMode])

  useEffect(() => {
    if (selectedTree && !displayedTrees.some((tree) => tree.properties.id === selectedTree.properties.id)) setSelectedTree(null)
  }, [displayedTrees, selectedTree])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map || !window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches) return

    if (!visibleSelectedTree?.geometry) {
      map.easeTo({ padding: { top: 0, right: 0, bottom: 0, left: 0 }, duration: 220 })
      return
    }

    setMobileFiltersOpen(false)
    setMobileInfoOpen(false)
    const bottomPadding = Math.min(
      Math.round(window.innerHeight * 0.46),
      MOBILE_SELECTED_SHEET_MAX_HEIGHT,
    )
    map.easeTo({
      center: visibleSelectedTree.geometry.coordinates,
      padding: { top: 96, right: 16, bottom: bottomPadding, left: 16 },
      duration: 320,
    })
  }, [mapReady, visibleSelectedTree])

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable')
      return
    }
    setLocationStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.longitude, position.coords.latitude])
        setLocationStatus('ready')
      },
      (error) => {
        setUserLocation(null)
        setLocationStatus(error.code === 1 ? 'denied' : 'unavailable')
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    )
  }

  const focusTree = (tree: HelsinkiTreeFeature) => {
    setSelectedTree(tree)
    if (tree.geometry && !window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches) {
      const map = mapRef.current
      map?.easeTo({ center: tree.geometry.coordinates, zoom: Math.max(map.getZoom(), 16) })
    }
  }

  const toggleSelectedTreeSaved = () => {
    if (!visibleSelectedTree) return
    setSavedTreeIds((current) => toggleSavedTreeId(current, visibleSelectedTree.properties.id))
  }

  return (
    <div className={`map-shell${mobileFiltersOpen ? ' is-mobile-filter-open' : ''}${visibleSelectedTree ? ' is-mobile-tree-selected' : ''}`}>
      <div ref={containerRef} className="map" aria-label="Interactive map of Helsinki trees" />
      <MobileMapControls
        search={filters.search}
        resultCount={displayedTrees.length}
        loading={loading}
        error={loadError}
        savedCount={savedTrees.length}
        savedActive={viewMode === 'saved'}
        activeFilterCount={activeFilterCount}
        filtersOpen={mobileFiltersOpen}
        locationStatus={locationStatus}
        onSearchChange={(search) => setFilters((current) => ({ ...current, search }))}
        onToggleSaved={() => setViewMode((current) => current === 'saved' ? 'browse' : 'saved')}
        onRequestLocation={requestLocation}
        onOpenFilters={() => {
          setMobileInfoOpen(false)
          setMobileFiltersOpen((current) => !current)
        }}
        onOpenInfo={() => {
          setMobileFiltersOpen(false)
          setMobileInfoOpen((current) => !current)
        }}
      />
      <div className="tree-filter-panel-host">
        <TreeFilterPanel
          filters={filters}
          options={filterOptions}
          resultCount={filteredTrees.length}
          loading={loading}
          error={loadError}
          viewMode={viewMode}
          savedTrees={savedTrees}
          locationStatus={locationStatus}
          nearbyTrees={nearbyTrees}
          onChange={setFilters}
          onReset={() => setFilters({ ...EMPTY_TREE_FILTERS })}
          onViewModeChange={setViewMode}
          onRequestLocation={requestLocation}
          onSelectTree={focusTree}
        />
      </div>
      <MobileFilterSheet
        open={mobileFiltersOpen}
        filters={filters}
        options={filterOptions}
        resultCount={filteredTrees.length}
        loading={loading}
        error={loadError}
        onChange={setFilters}
        onReset={() => setFilters({ ...EMPTY_TREE_FILTERS })}
        onClose={() => setMobileFiltersOpen(false)}
        onOpenInfo={() => {
          setMobileFiltersOpen(false)
          setMobileInfoOpen(true)
        }}
      />
      {mobileInfoOpen ? (
        <section className="mobile-map-info" aria-label="Mobiilin puutietojen lähde">
          <div className="mobile-map-info__header">
            <h2>Tietoja puuaineistosta</h2>
            <button type="button" onClick={() => setMobileInfoOpen(false)} aria-label="Sulje puuaineiston tiedot">×</button>
          </div>
          <TreeDataInfo />
        </section>
      ) : null}
      {visibleSelectedTree ? (
        <MobileTreeDetailsSheet
          key={visibleSelectedTree.properties.id}
          tree={visibleSelectedTree}
          isSaved={savedTreeIds.includes(visibleSelectedTree.properties.id)}
          distanceMeters={selectedTreeDistance}
          onClose={() => setSelectedTree(null)}
          onToggleSaved={toggleSelectedTreeSaved}
        />
      ) : null}
      {visibleSelectedTree ? (
        <TreeDetailsPanel
          tree={visibleSelectedTree}
          isSaved={savedTreeIds.includes(visibleSelectedTree.properties.id)}
          distanceMeters={selectedTreeDistance}
          onClose={() => setSelectedTree(null)}
          onToggleSaved={toggleSelectedTreeSaved}
        />
      ) : null}
    </div>
  )
}
