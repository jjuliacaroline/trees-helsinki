import { useEffect, useRef, useState } from 'react'
import { Map, NavigationControl, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { normalizeTreeFeature, type HelsinkiTreeFeature } from '../data/treeRegistry'
import { TreeDetailsPanel } from './TreeDetailsPanel'

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
  const [selectedTree, setSelectedTree] = useState<HelsinkiTreeFeature | null>(null)

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const map = new Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center: HELSINKI_CENTER,
      zoom: 11.5,
    })

    map.addControl(new NavigationControl(), 'top-right')

    map.on('load', () => {
      map.addSource(TREE_SOURCE_ID, {
        type: 'geojson',
        data: TREE_DATA_URL,
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
      if (!feature) {
        return
      }

      try {
        setSelectedTree(normalizeTreeFeature(feature))
      } catch (error) {
        console.error('Could not read selected tree feature', error)
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
      map.remove()
    }
  }, [])

  return (
    <div className="map-shell">
      <div ref={containerRef} className="map" aria-label="Interactive map of Helsinki trees" />
      {selectedTree ? (
        <TreeDetailsPanel tree={selectedTree} onClose={() => setSelectedTree(null)} />
      ) : null}
    </div>
  )
}
