import { distanceMeters, formatDistance } from '../data/treeProximity'
import type { HelsinkiTreeFeature } from '../data/treeRegistry'
import { MobileBottomSheet } from './MobileBottomSheet'
import { getTreeMapCategory } from './treeMapData'
import { TREE_MARKER_STYLES } from './treeMarkerStyles'
import './mobileSavedTreesSheet.css'

interface MobileSavedTreesSheetProps {
  open: boolean
  trees: readonly HelsinkiTreeFeature[]
  userLocation: readonly [number, number] | null
  onBack: () => void
  onSelectTree: (tree: HelsinkiTreeFeature) => void
  onRemoveTree: (treeId: number) => void
}

function commonName(tree: HelsinkiTreeFeature): string {
  const value = tree.properties.suomenknimi?.trim()
  if (!value) {
    return scientificName(tree) ?? `Puu ${tree.properties.id}`
  }

  if (value !== value.toLocaleUpperCase('fi-FI')) return value

  return value
    .toLocaleLowerCase('fi-FI')
    .replace(/(^|[\s/-])(\p{L})/gu, (_match, separator: string, letter: string) => (
      `${separator}${letter.toLocaleUpperCase('fi-FI')}`
    ))
}

function scientificName(tree: HelsinkiTreeFeature): string | null {
  const parts = [tree.properties.suku, tree.properties.laji].filter(
    (value): value is string => Boolean(value),
  )
  return parts.length > 0 ? parts.join(' ') : null
}

function TreeThumbnail({ tree }: { tree: HelsinkiTreeFeature }) {
  const name = commonName(tree)
  const markerStyle = TREE_MARKER_STYLES[getTreeMapCategory(tree)]
  const initial = name.charAt(0).toLocaleUpperCase('fi-FI') || 'P'

  return (
    <span
      className="mobile-saved-trees__thumbnail"
      style={{ color: markerStyle.color }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 72 72">
        <path d="M36 58V26" />
        <path d="M36 38c-10-1-18-7-20-18 11-1 20 5 20 18Z" />
        <path d="M36 32c9 0 17-5 19-15 8 8 5 20-5 24-5 2-10 1-14-2" />
      </svg>
      <span>{initial}</span>
    </span>
  )
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20.5 5.7 14.4a5.2 5.2 0 0 1 7.3-7.5 5.2 5.2 0 0 1 7.3 7.5L12 20.5Z" />
    </svg>
  )
}

export function MobileSavedTreesSheet({
  open,
  trees,
  userLocation,
  onBack,
  onSelectTree,
  onRemoveTree,
}: MobileSavedTreesSheetProps) {
  return (
    <MobileBottomSheet open={open} ariaLabel="Tallennetut puut" onClose={onBack}>
      <section className="mobile-saved-trees">
        <header className="mobile-saved-trees__header">
          <button type="button" className="mobile-saved-trees__back" onClick={onBack}>
            <span aria-hidden="true">‹</span>
            Takaisin
          </button>
          <h2>Tallennetut ({trees.length.toLocaleString('fi-FI')})</h2>
        </header>

        {trees.length === 0 ? (
          <p className="mobile-saved-trees__empty">Ei tallennettuja puita.</p>
        ) : (
          <ul className="mobile-saved-trees__list">
            {trees.map((tree) => {
              const name = commonName(tree)
              const latinName = scientificName(tree)
              const distance = userLocation && tree.geometry
                ? formatDistance(distanceMeters(userLocation, tree.geometry.coordinates))
                : null

              return (
                <li key={tree.properties.id} className="mobile-saved-trees__item">
                  <button
                    type="button"
                    className="mobile-saved-trees__select"
                    onClick={() => onSelectTree(tree)}
                    aria-label={`Näytä ${name} kartalla`}
                  >
                    <TreeThumbnail tree={tree} />
                    <span className="mobile-saved-trees__identity">
                      <strong>{name}</strong>
                      {latinName ? <span className="mobile-saved-trees__scientific">{latinName}</span> : null}
                      {distance ? <span className="mobile-saved-trees__distance">{distance}</span> : null}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="mobile-saved-trees__remove"
                    onClick={() => onRemoveTree(tree.properties.id)}
                    aria-label={`Poista ${name} tallennetuista`}
                  >
                    <HeartIcon />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </MobileBottomSheet>
  )
}
