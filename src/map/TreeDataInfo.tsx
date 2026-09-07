import { useEffect, useState } from 'react'
import {
  normalizeTreeSnapshotMetadata,
  type TreeSnapshotMetadata,
} from '../data/treeSnapshotMetadata'
import './treeDataInfo.css'

const METADATA_URL = `${import.meta.env.BASE_URL}data/generated/tree-metadata.json`
const DATASET_URL = 'https://hri.fi/data/en_GB/dataset/helsingin-kaupungin-puurekisteri'
const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/'
const OPENFREEMAP_URL = 'https://openfreemap.org/'
const OPENSTREETMAP_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright'
const MAPLIBRE_URL = 'https://maplibre.org/'

function formatDate(value: string, includeTime = false): string {
  const date = new Date(value)
  return new Intl.DateTimeFormat(
    'fi-FI',
    includeTime
      ? { dateStyle: 'medium', timeStyle: 'short' }
      : { dateStyle: 'medium' },
  ).format(date)
}

export function TreeDataInfo() {
  const [metadata, setMetadata] = useState<TreeSnapshotMetadata | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadMetadata() {
      try {
        const response = await fetch(METADATA_URL, { signal: controller.signal })
        if (!response.ok) return
        setMetadata(normalizeTreeSnapshotMetadata(await response.json()))
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        console.warn('Could not load tree snapshot metadata', error)
      }
    }

    void loadMetadata()
    return () => controller.abort()
  }, [])

  return (
    <section className="tree-data-info" aria-label="Puutietojen lähde">
      <p>
        <strong>Data:</strong>{' '}
        <a href={DATASET_URL} target="_blank" rel="noreferrer">
          Helsingin kaupungin puurekisteri
        </a>{' '}
        ·{' '}
        <a href={LICENSE_URL} target="_blank" rel="noreferrer">
          CC BY 4.0
        </a>
      </p>
      <p>
        <strong>Karttapohja:</strong>{' '}
        <a href={OPENFREEMAP_URL} target="_blank" rel="noreferrer">
          OpenFreeMap
        </a>{' '}
        · ©{' '}
        <a href={OPENSTREETMAP_COPYRIGHT_URL} target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>{' '}
        ·{' '}
        <a href={MAPLIBRE_URL} target="_blank" rel="noreferrer">
          MapLibre
        </a>
      </p>
      {metadata ? (
        <p className="tree-data-info__metadata">
          Snapshot muodostettu {formatDate(metadata.generatedAt, true)}
          {metadata.sourceUpdatedAt
            ? ` · Lähdedata päivitetty ${formatDate(metadata.sourceUpdatedAt)}`
            : ''}
        </p>
      ) : null}
      <p className="tree-data-info__notice">
        Rekisteri ei kata kaikkia Helsingin puita, ja osa tiedoista tai tietueista voi olla puutteellisia.
      </p>
    </section>
  )
}
