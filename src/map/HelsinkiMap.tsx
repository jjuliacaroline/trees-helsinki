import { useEffect, useRef } from 'react'
import { Map, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

setWorkerUrl(maplibreWorkerUrl)

const HELSINKI_CENTER: [number, number] = [24.9384, 60.1699]
const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

export function HelsinkiMap() {
  const containerRef = useRef<HTMLDivElement | null>(null)

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

    return () => {
      map.remove()
    }
  }, [])

  return <div ref={containerRef} className="map" aria-label="Interactive map of Helsinki" />
}
