import { FRUIT_CATEGORY_OPTIONS, type FruitCategoryFilter } from '../data/treeClassifications'
import {
  hasActiveTreeFilters,
  hasInvalidPlantingYearRange,
  type TreeFilterOptions,
  type TreeFilters,
} from '../data/treeFiltering'
import { TreeMapLegend } from './TreeMapLegend'

interface TreeFilterPanelProps {
  filters: TreeFilters
  options: TreeFilterOptions
  resultCount: number
  loading: boolean
  error: string | null
  onChange: (filters: TreeFilters) => void
  onReset: () => void
}

export function TreeFilterPanel({
  filters,
  options,
  resultCount,
  loading,
  error,
  onChange,
  onReset,
}: TreeFilterPanelProps) {
  const update = <Key extends keyof TreeFilters,>(key: Key, value: TreeFilters[Key]) => {
    onChange({ ...filters, [key]: value })
  }

  const updateFruitCategory = (fruitCategory: FruitCategoryFilter) => {
    onChange({
      ...filters,
      fruitCategory,
      genus: '',
      species: '',
      mainType: '',
      plantingYearFrom: null,
      plantingYearTo: null,
      sizeClass: '',
    })
  }

  const updateGenus = (genus: string) => {
    onChange({ ...filters, genus, species: '' })
  }

  const parseOptionalYear = (value: string): number | null => (value === '' ? null : Number(value))
  const invalidPlantingYearRange = hasInvalidPlantingYearRange(filters)
  const plantingYearErrorId = 'planting-year-range-error'

  const activeFilterCount = [
    filters.fruitCategory,
    filters.genus,
    filters.species,
    filters.mainType,
    filters.plantingYearFrom !== null || filters.plantingYearTo !== null ? 'planting-year' : '',
    filters.sizeClass,
  ].filter((value) => value !== '').length

  return (
    <section className="tree-filter-panel" aria-label="Puiden haku ja suodatus">
      <label className="tree-filter-panel__search">
        <span>Hae puita</span>
        <input
          type="search"
          value={filters.search}
          onChange={(event) => update('search', event.target.value)}
          placeholder="Esim. luumu, Prunus tai puisto"
        />
      </label>

      <label className="tree-filter-panel__fruit">
        <span>Näytä</span>
        <select
          value={filters.fruitCategory}
          onChange={(event) => updateFruitCategory(event.target.value as FruitCategoryFilter)}
        >
          <option value="">Kaikki puut</option>
          {FRUIT_CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {filters.fruitCategory ? (
          <small>Syötävyys on Trees Helsingin oma luokitus puun suvun ja lajin perusteella.</small>
        ) : null}
      </label>

      <p className="tree-filter-panel__status" aria-live="polite">
        {loading ? 'Ladataan puutietoja…' : error ?? `${resultCount.toLocaleString('fi-FI')} puuta kartalla`}
      </p>

      {filters.fruitCategory === 'edible' ? <TreeMapLegend /> : null}

      <details className="tree-filter-panel__filters">
        <summary>Suodattimet{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</summary>

        <div className="tree-filter-panel__fields">
          <label>
            <span>Suku</span>
            <select value={filters.genus} onChange={(event) => updateGenus(event.target.value)}>
              <option value="">Kaikki suvut</option>
              {options.genera.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Laji</span>
            <select value={filters.species} onChange={(event) => update('species', event.target.value)}>
              <option value="">Kaikki lajit</option>
              {options.species.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Tyyppi</span>
            <select value={filters.mainType} onChange={(event) => update('mainType', event.target.value)}>
              <option value="">Kaikki tyypit</option>
              {options.mainTypes.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>

          <fieldset className="tree-filter-panel__year-range">
            <legend>Istutusvuosi</legend>
            <div className="tree-filter-panel__year-inputs">
              <label>
                <span>Alkaen</span>
                <input
                  type="number"
                  step="1"
                  inputMode="numeric"
                  value={filters.plantingYearFrom ?? ''}
                  onChange={(event) => update('plantingYearFrom', parseOptionalYear(event.target.value))}
                  aria-invalid={invalidPlantingYearRange}
                  aria-describedby={invalidPlantingYearRange ? plantingYearErrorId : undefined}
                />
              </label>
              <label>
                <span>Asti</span>
                <input
                  type="number"
                  step="1"
                  inputMode="numeric"
                  value={filters.plantingYearTo ?? ''}
                  onChange={(event) => update('plantingYearTo', parseOptionalYear(event.target.value))}
                  aria-invalid={invalidPlantingYearRange}
                  aria-describedby={invalidPlantingYearRange ? plantingYearErrorId : undefined}
                />
              </label>
            </div>
            {invalidPlantingYearRange ? (
              <p id={plantingYearErrorId} className="tree-filter-panel__validation" role="status">
                Alkuvuosi ei voi olla loppuvuotta suurempi.
              </p>
            ) : null}
          </fieldset>

          <label>
            <span>Kokoluokka</span>
            <select value={filters.sizeClass} onChange={(event) => update('sizeClass', event.target.value)}>
              <option value="">Kaikki kokoluokat</option>
              {options.sizeClasses.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
      </details>

      <button
        className="tree-filter-panel__reset"
        type="button"
        onClick={onReset}
        disabled={!hasActiveTreeFilters(filters)}
      >
        Tyhjennä haku ja suodattimet
      </button>
    </section>
  )
}
