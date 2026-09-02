import { useState } from 'react'
import { classifyTree } from '../data/treeClassifications'
import { formatDistance } from '../data/treeProximity'
import type { HelsinkiTreeFeature } from '../data/treeRegistry'
import { MobileBottomSheet } from './MobileBottomSheet'
import { readableCommonName, readableScientificName } from './treeDisplayNames'
import { getTreeMapCategory } from './treeMapData'
import { TREE_MARKER_STYLES } from './treeMarkerStyles'
import './mobileTreeDetailsSheet.css'

const UNKNOWN_VALUE = 'Ei tietoa'

interface MobileTreeDetailsSheetProps {
  tree: HelsinkiTreeFeature
  isSaved: boolean
  distanceMeters?: number
  onClose: () => void
  onToggleSaved: () => void
}

function displayValue(value: string | number | null): string {
  return value === null ? UNKNOWN_VALUE : String(value)
}

function treeLocation(tree: HelsinkiTreeFeature): string {
  return tree.properties.kadunnimi ?? tree.properties.puistonnimi ?? UNKNOWN_VALUE
}

function treeCoordinates(tree: HelsinkiTreeFeature): string {
  if (!tree.geometry) return UNKNOWN_VALUE
  const [longitude, latitude] = tree.geometry.coordinates
  return `${longitude.toFixed(6)}, ${latitude.toFixed(6)}`
}

function BotanicalPlaceholder({ tree }: { tree: HelsinkiTreeFeature }) {
  const commonName = readableCommonName(tree.properties.suomenknimi) ?? UNKNOWN_VALUE
  const markerStyle = TREE_MARKER_STYLES[getTreeMapCategory(tree)]
  const initial = commonName.trim().charAt(0).toLocaleUpperCase('fi-FI') || 'P'

  return (
    <div
      className="mobile-tree-details-sheet__placeholder"
      style={{ color: markerStyle.color }}
      role="img"
      aria-label={`Kasvitieteellinen kuvitus lajille ${commonName}. Ei valokuva yksittäisestä rekisteripuusta.`}
    >
      <svg viewBox="0 0 96 96" aria-hidden="true">
        <path d="M48 75V36" />
        <path d="M48 51c-13-1-23-9-25-23 14-1 25 7 25 23Z" />
        <path d="M48 42c12 0 22-7 25-20 10 11 6 27-7 33-7 3-13 1-18-2" />
        <path d="M48 61c-10 0-18-5-22-14" />
      </svg>
      <span aria-hidden="true">{initial}</span>
    </div>
  )
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.4" />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20.5 5.7 14.4a5.2 5.2 0 0 1 7.3-7.5l-1 1 1-1a5.2 5.2 0 0 1 7.3 7.5L12 20.5Z" />
    </svg>
  )
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg className={expanded ? 'is-expanded' : ''} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 5 7 7-7 7" />
    </svg>
  )
}

export function MobileTreeDetailsSheet({
  tree,
  isSaved,
  distanceMeters,
  onClose,
  onToggleSaved,
}: MobileTreeDetailsSheetProps) {
  const { properties } = tree
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const classification = classifyTree(tree)
  const coordinates = treeCoordinates(tree)
  const commonName = readableCommonName(properties.suomenknimi) ?? UNKNOWN_VALUE
  const latinName = readableScientificName(properties)

  const copyCoordinates = async () => {
    if (!tree.geometry || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(coordinates)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <MobileBottomSheet open ariaLabel="Valitun puun tiedot" onClose={onClose}>
      <article className="mobile-tree-details-sheet">
        <header className="mobile-tree-details-sheet__hero">
          <BotanicalPlaceholder tree={tree} />
          <div className="mobile-tree-details-sheet__identity">
            <h2>{commonName}</h2>
            {latinName ? <p>{latinName}</p> : null}
          </div>
        </header>

        <dl className="mobile-tree-details-sheet__summary">
          <div>
            <dt>Istutettu</dt>
            <dd>{displayValue(properties.istutusvuosi)}</dd>
          </div>
        </dl>

        {distanceMeters !== undefined ? (
          <p className="mobile-tree-details-sheet__distance">
            <LocationIcon />
            <span>{formatDistance(distanceMeters)} päästä</span>
          </p>
        ) : null}

        <button
          type="button"
          className={`mobile-tree-details-sheet__save${isSaved ? ' is-saved' : ''}`}
          onClick={onToggleSaved}
          aria-pressed={isSaved}
        >
          <SaveIcon />
          <span>{isSaved ? 'Tallennettu' : 'Tallenna'}</span>
        </button>

        <button
          type="button"
          className="mobile-tree-details-sheet__more"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          <span>{expanded ? 'Piilota lisätiedot' : 'Näytä kaikki tiedot'}</span>
          <ChevronIcon expanded={expanded} />
        </button>

        {expanded ? (
          <section className="mobile-tree-details-sheet__full" aria-label="Kaikki puun tiedot">
            {classification ? (
              <div className="mobile-tree-details-sheet__classification">
                <span>Trees Helsinki -luokitus</span>
                <strong>{classification.label}</strong>
                <p>Syötävä hedelmäpuu · johdettu puun suvusta ja lajista.</p>
              </div>
            ) : null}

            <dl className="mobile-tree-details-sheet__full-list">
              <div><dt>Sijainti</dt><dd>{treeLocation(tree)}</dd></div>
              <div><dt>Tyyppi</dt><dd>{displayValue(properties.paatyyppi)}</dd></div>
              <div><dt>Istutusvuosi</dt><dd>{displayValue(properties.istutusvuosi)}</dd></div>
              <div><dt>Kokoluokka</dt><dd>{displayValue(properties.kokoluokka)}</dd></div>
              <div><dt>Rekisteritunnus</dt><dd>{displayValue(properties.tunnus)}</dd></div>
              <div>
                <dt>Koordinaatit</dt>
                <dd className="mobile-tree-details-sheet__coordinates">
                  <span>{coordinates}</span>
                  {tree.geometry ? (
                    <button type="button" onClick={() => void copyCoordinates()}>
                      {copied ? 'Kopioitu' : 'Kopioi'}
                    </button>
                  ) : null}
                </dd>
              </div>
              <div><dt>Rekisterin ID</dt><dd>{properties.id}</dd></div>
              <div><dt>Datan omistaja</dt><dd>{displayValue(properties.datanomistaja)}</dd></div>
              <div><dt>Päivitetty tietopalveluun</dt><dd>{displayValue(properties.paivitetty_tietopalveluun)}</dd></div>
            </dl>
          </section>
        ) : null}
      </article>
    </MobileBottomSheet>
  )
}
