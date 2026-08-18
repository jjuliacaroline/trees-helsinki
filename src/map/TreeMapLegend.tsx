import { TREE_EDIBLE_FRUIT_LEGEND_ITEMS } from './treeMarkerStyles'

export function TreeMapLegend() {
  return (
    <div className="tree-map-legend" aria-label="Puiden karttamerkkien selite">
      <p className="tree-map-legend__title">Karttamerkit</p>
      <div className="tree-map-legend__items">
        {TREE_EDIBLE_FRUIT_LEGEND_ITEMS.map((item) => {
          return (
            <span key={item.key} className="tree-map-legend__item">
              <span
                className={`tree-map-legend__dot tree-map-legend__dot--${item.key}`}
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              {item.label}
            </span>
          )
        })}
      </div>
      <p className="tree-map-legend__hint">
        Klusterit säilyttävät hedelmätyypin värin myös kauempaa. Valittu puu merkitään
        tummalla renkaalla.
      </p>
    </div>
  )
}
