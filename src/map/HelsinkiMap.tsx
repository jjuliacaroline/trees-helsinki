import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const HELSINKI_CENTER: [number, number] = [24.9384, 60.1699]
const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

export function HelsinkiMap() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center: HELSINKI_CENTER,
      zoom: 11.5,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')

    return () => {
      map.remove()
    }
  }, [])

  return <div ref={containerRef} className="map" aria-label="Interactive map of Helsinki" />
}
