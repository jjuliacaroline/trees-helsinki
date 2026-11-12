import { FRUIT_CATEGORY_OPTIONS, type FruitCategoryFilter } from '../data/treeClassifications'
import {
  hasActiveTreeFilters,
  hasInvalidPlantingYearRange,
  type TreeFilterOptions,
  type TreeFilters,
} from '../data/treeFiltering'
import { formatDistance, type NearbyTree } from '../data/treeProximity'
import type { HelsinkiTreeFeature } from '../data/treeRegistry'
import { TreeMapLegend } from './TreeMapLegend'

export type TreeViewMode = 'browse' | 'saved'
export type LocationStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'unavailable'

interface TreeFilterPanelProps {
  filters: TreeFilters
  options: TreeFilterOptions
  resultCount: number
  loading: boolean
  error: string | null
  viewMode: TreeViewMode
  savedTrees: readonly HelsinkiTreeFeature[]
  locationStatus: LocationStatus
  nearbyTrees: readonly NearbyTree[]
  onChange: (filters: TreeFilters) => void
  onReset: () => void
  onViewModeChange: (mode: TreeViewMode) => void
  onRequestLocation: () => void
  onSelectTree: (tree: HelsinkiTreeFeature) => void
}

function treeLabel(tree: HelsinkiTreeFeature): string {
  const scientificName = [tree.properties.suku, tree.properties.laji].filter(Boolean).join(' ')
  return tree.properties.suomenknimi ?? (scientificName || `Puu ${tree.properties.id}`)
}

export function TreeFilterPanel({
  filters,
  options,
  resultCount,
  loading,
  error,
  viewMode,
  savedTrees,
  locationStatus,
  nearbyTrees,
  onChange,
  onReset,
  onViewModeChange,
  onRequestLocation,
  onSelectTree,
}: TreeFilterPanelProps) {
  const update = <Key extends keyof TreeFilters,>(key: Key, value: TreeFilters[Key]) => onChange({ ...filters, [key]: value })
  const updateFruitCategory = (fruitCategory: FruitCategoryFilter) => onChange({ ...filters, fruitCategory, genus: '', species: '', mainType: '', plantingYearFrom: null, plantingYearTo: null, sizeClass: '' })
  const updateGenus = (genus: string) => onChange({ ...filters, genus, species: '' })
  const parseOptionalYear = (value: string): number | null => (value === '' ? null : Number(value))
  const invalidPlantingYearRange = hasInvalidPlantingYearRange(filters)
  const plantingYearErrorId = 'planting-year-range-error'
  const activeFilterCount = [filters.fruitCategory, filters.genus, filters.species, filters.mainType, filters.plantingYearFrom !== null || filters.plantingYearTo !== null ? 'planting-year' : '', filters.sizeClass].filter((value) => value !== '').length

  return (
    <section className="tree-filter-panel" aria-label="Puiden haku ja suodatus">
      <div className="tree-filter-panel__views" aria-label="Karttanäkymä">
        <button type="button" className={viewMode === 'browse' ? 'is-active' : ''} onClick={() => onViewModeChange('browse')}>Kartta</button>
        <button type="button" className={viewMode === 'saved' ? 'is-active' : ''} onClick={() => onViewModeChange('saved')}>Tallennetut ({savedTrees.length})</button>
      </div>

      {viewMode === 'saved' ? (
        <div className="tree-filter-panel__saved">
          <p className="tree-filter-panel__status">{savedTrees.length === 0 ? 'Ei tallennettuja puita.' : `${savedTrees.length.toLocaleString('fi-FI')} tallennettua puuta`}</p>
          {savedTrees.length > 0 ? <ul className="tree-quick-list">{savedTrees.map((tree) => <li key={tree.properties.id}><button type="button" onClick={() => onSelectTree(tree)}><strong>{treeLabel(tree)}</strong><span>{tree.properties.kadunnimi ?? tree.properties.puistonnimi ?? 'Sijainti ei tiedossa'}</span></button></li>)}</ul> : null}
        </div>
      ) : (
        <>
          <label className="tree-filter-panel__search" htmlFor="tree-search"><span id="tree-search-label">Hae puita</span><input id="tree-search" aria-labelledby="tree-search-label" type="search" value={filters.search} onChange={(event) => update('search', event.target.value)} placeholder="Esim. luumu, Prunus tai puisto" /></label>
          <label className="tree-filter-panel__fruit" htmlFor="tree-fruit-category"><span id="tree-fruit-category-label">Näytä</span><select id="tree-fruit-category" aria-labelledby="tree-fruit-category-label" value={filters.fruitCategory} onChange={(event) => updateFruitCategory(event.target.value as FruitCategoryFilter)}><option value="">Kaikki puut</option>{FRUIT_CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{filters.fruitCategory ? <small>Syötävyys on Trees Helsingin oma luokitus puun suvun ja lajin perusteella.</small> : null}</label>
          <p className="tree-filter-panel__status" aria-live="polite">{loading ? 'Ladataan puutietoja…' : error ?? `${resultCount.toLocaleString('fi-FI')} puuta kartalla`}</p>
          {filters.fruitCategory === 'edible' ? <TreeMapLegend /> : null}

          <section className="tree-filter-panel__nearby" aria-label="Lähimmät puut">
            <button type="button" className="tree-filter-panel__location" onClick={onRequestLocation} disabled={locationStatus === 'requesting'}>{locationStatus === 'requesting' ? 'Haetaan sijaintia…' : locationStatus === 'ready' ? 'Päivitä sijaintini' : 'Käytä sijaintiani'}</button>
            {locationStatus === 'denied' ? <p className="tree-filter-panel__location-note">Sijaintilupaa ei annettu. Karttaa ja suodattimia voi käyttää normaalisti.</p> : null}
            {locationStatus === 'unavailable' ? <p className="tree-filter-panel__location-note">Sijainti ei ole käytettävissä tässä selaimessa.</p> : null}
            {locationStatus === 'ready' ? <><h3>Lähimmät puut</h3>{nearbyTrees.length === 0 ? <p className="tree-filter-panel__location-note">Nykyisillä suodattimilla ei löytynyt puita.</p> : <ul className="tree-quick-list">{nearbyTrees.map(({ tree, distanceMeters }) => <li key={tree.properties.id}><button type="button" onClick={() => onSelectTree(tree)}><strong>{treeLabel(tree)}</strong><span>{formatDistance(distanceMeters)}</span></button></li>)}</ul>}</> : null}
          </section>

          <details className="tree-filter-panel__filters"><summary>Suodattimet{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</summary><div className="tree-filter-panel__fields">
            <label htmlFor="tree-genus"><span id="tree-genus-label">Suku</span><select id="tree-genus" aria-labelledby="tree-genus-label" value={filters.genus} onChange={(event) => updateGenus(event.target.value)}><option value="">Kaikki suvut</option>{options.genera.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label htmlFor="tree-species"><span id="tree-species-label">Laji</span><select id="tree-species" aria-labelledby="tree-species-label" value={filters.species} onChange={(event) => update('species', event.target.value)}><option value="">Kaikki lajit</option>{options.species.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label htmlFor="tree-main-type"><span id="tree-main-type-label">Tyyppi</span><select id="tree-main-type" aria-labelledby="tree-main-type-label" value={filters.mainType} onChange={(event) => update('mainType', event.target.value)}><option value="">Kaikki tyypit</option>{options.mainTypes.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <fieldset className="tree-filter-panel__year-range"><legend>Istutusvuosi</legend><div className="tree-filter-panel__year-inputs"><label htmlFor="tree-planting-year-from"><span id="tree-planting-year-from-label">Alkaen</span><input id="tree-planting-year-from" aria-labelledby="tree-planting-year-from-label" type="number" step="1" inputMode="numeric" value={filters.plantingYearFrom ?? ''} onChange={(event) => update('plantingYearFrom', parseOptionalYear(event.target.value))} aria-invalid={invalidPlantingYearRange} aria-describedby={invalidPlantingYearRange ? plantingYearErrorId : undefined} /></label><label htmlFor="tree-planting-year-to"><span id="tree-planting-year-to-label">Asti</span><input id="tree-planting-year-to" aria-labelledby="tree-planting-year-to-label" type="number" step="1" inputMode="numeric" value={filters.plantingYearTo ?? ''} onChange={(event) => update('plantingYearTo', parseOptionalYear(event.target.value))} aria-invalid={invalidPlantingYearRange} aria-describedby={invalidPlantingYearRange ? plantingYearErrorId : undefined} /></label></div>{invalidPlantingYearRange ? <p id={plantingYearErrorId} className="tree-filter-panel__validation" role="status">Alkuvuosi ei voi olla loppuvuotta suurempi.</p> : null}</fieldset>
            <label htmlFor="tree-size-class"><span id="tree-size-class-label">Kokoluokka</span><select id="tree-size-class" aria-labelledby="tree-size-class-label" value={filters.sizeClass} onChange={(event) => update('sizeClass', event.target.value)}><option value="">Kaikki kokoluokat</option>{options.sizeClasses.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          </div></details>
          <button className="tree-filter-panel__reset" type="button" onClick={onReset} disabled={!hasActiveTreeFilters(filters)}>Tyhjennä haku ja suodattimet</button>
        </>
      )}

      <details className="tree-filter-panel__privacy">
        <summary>Tietosuoja</summary>
        <p>Sijaintia käytetään vain, kun pyydät sitä selaimen sijaintitoiminnolla. Sovellus pitää koordinaatit vain selaimen muistissa eikä lähetä niitä sovelluksen palvelimelle. Kartta keskitetään pyytämääsi sijaintiin, joten <a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a> saa näkyvän alueen karttaruutupyynnöt. Sovellus ei tallenna sijaintia. Tallennetut puut säilytetään localStoragessa vain vakaina numeerisina puutunnisteina.</p>
      </details>
    </section>
  )
}
