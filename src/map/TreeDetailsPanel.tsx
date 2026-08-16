import type { HelsinkiTreeFeature } from '../data/treeRegistry'

const UNKNOWN_VALUE = 'Ei tietoa'

interface TreeDetailsPanelProps {
  tree: HelsinkiTreeFeature
  onClose: () => void
}

function displayValue(value: string | number | null): string {
  return value === null ? UNKNOWN_VALUE : String(value)
}

function scientificName(tree: HelsinkiTreeFeature): string {
  const parts = [tree.properties.suku, tree.properties.laji].filter(
    (value): value is string => Boolean(value),
  )

  return parts.length > 0 ? parts.join(' ') : UNKNOWN_VALUE
}

function treeLocation(tree: HelsinkiTreeFeature): string {
  return tree.properties.kadunnimi ?? tree.properties.puistonnimi ?? UNKNOWN_VALUE
}

function treeCoordinates(tree: HelsinkiTreeFeature): string {
  if (!tree.geometry) {
    return UNKNOWN_VALUE
  }

  const [longitude, latitude] = tree.geometry.coordinates
  return `${longitude.toFixed(6)}, ${latitude.toFixed(6)}`
}

export function TreeDetailsPanel({ tree, onClose }: TreeDetailsPanelProps) {
  const { properties } = tree

  return (
    <aside className="tree-details" aria-label="Selected tree details">
      <div className="tree-details__header">
        <div>
          <p className="tree-details__eyebrow">Valittu puu</p>
          <h2>{properties.suomenknimi ?? UNKNOWN_VALUE}</h2>
          <p className="tree-details__scientific-name">{scientificName(tree)}</p>
        </div>
        <button className="tree-details__close" type="button" onClick={onClose} aria-label="Sulje puun tiedot">
          ×
        </button>
      </div>

      <dl className="tree-details__list">
        <div>
          <dt>Sijainti</dt>
          <dd>{treeLocation(tree)}</dd>
        </div>
        <div>
          <dt>Tyyppi</dt>
          <dd>{displayValue(properties.paatyyppi)}</dd>
        </div>
        <div>
          <dt>Istutusvuosi</dt>
          <dd>{displayValue(properties.istutusvuosi)}</dd>
        </div>
        <div>
          <dt>Kokoluokka</dt>
          <dd>{displayValue(properties.kokoluokka)}</dd>
        </div>
        <div>
          <dt>Rekisteritunnus</dt>
          <dd>{displayValue(properties.tunnus)}</dd>
        </div>
        <div>
          <dt>Koordinaatit</dt>
          <dd>{treeCoordinates(tree)}</dd>
        </div>
      </dl>

      <details className="tree-details__more">
        <summary>Lisätiedot</summary>
        <dl className="tree-details__list tree-details__list--compact">
          <div>
            <dt>Rekisterin ID</dt>
            <dd>{properties.id}</dd>
          </div>
          <div>
            <dt>Datan omistaja</dt>
            <dd>{displayValue(properties.datanomistaja)}</dd>
          </div>
          <div>
            <dt>Päivitetty tietopalveluun</dt>
            <dd>{displayValue(properties.paivitetty_tietopalveluun)}</dd>
          </div>
        </dl>
      </details>
    </aside>
  )
}
