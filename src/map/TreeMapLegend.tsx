import {
  TREE_MARKER_LEGEND_CATEGORIES,
  TREE_MARKER_STYLES,
} from './treeMarkerStyles'

export function TreeMapLegend() {
  return (
    <div className="tree-map-legend" aria-label="Puiden karttamerkkien selite">
      <p className="tree-map-legend__title">Karttamerkit</p>
      <div className="tree-map-legend__items">
        {TREE_MARKER_LEGEND_CATEGORIES.map((category) => {
          const style = TREE_MARKER_STYLES[category]
          return (
            <span key={category} className="tree-map-legend__item">
              <span
                className={`tree-map-legend__dot tree-map-legend__dot--${category}`}
                style={{ backgroundColor: style.color }}
                aria-hidden="true"
              />
              {style.label}
            </span>
          )
        })}
      </div>
      <p className="tree-map-legend__hint">
        Hedelmäpuut korostuvat myös kauempaa. Valittu puu merkitään tummalla renkaalla.
      </p>
    </div>
  )
}
