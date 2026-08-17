import {
  hasActiveTreeFilters,
  type TreeFilterOptions,
  type TreeFilters,
} from '../data/treeFiltering'

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

  const updateGenus = (genus: string) => {
    onChange({ ...filters, genus, species: '' })
  }

  const activeFilterCount = [
    filters.genus,
    filters.species,
    filters.mainType,
    filters.plantingYear,
    filters.sizeClass,
  ].filter((value) => value !== '' && value !== null).length

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

      <p className="tree-filter-panel__status" aria-live="polite">
        {loading ? 'Ladataan puutietoja…' : error ?? `${resultCount.toLocaleString('fi-FI')} puuta kartalla`}
      </p>

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

          <label>
            <span>Istutusvuosi</span>
            <select
              value={filters.plantingYear ?? ''}
              onChange={(event) => update('plantingYear', event.target.value ? Number(event.target.value) : null)}
            >
              <option value="">Kaikki vuodet</option>
              {options.plantingYears.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>

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
