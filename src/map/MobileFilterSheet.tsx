import { useId } from 'react'
import { FRUIT_CATEGORY_OPTIONS, type FruitCategoryFilter } from '../data/treeClassifications'
import {
  hasInvalidPlantingYearRange,
  type TreeFilterOptions,
  type TreeFilters,
} from '../data/treeFiltering'
import { MobileBottomSheet } from './MobileBottomSheet'

interface MobileFilterSheetProps {
  open: boolean
  filters: TreeFilters
  options: TreeFilterOptions
  resultCount: number
  loading: boolean
  error: string | null
  onChange: (filters: TreeFilters) => void
  onReset: () => void
  onClose: () => void
  onOpenInfo: () => void
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10.5v6M12 7.5h.01" />
    </svg>
  )
}

export function MobileFilterSheet({
  open,
  filters,
  options,
  resultCount,
  loading,
  error,
  onChange,
  onReset,
  onClose,
  onOpenInfo,
}: MobileFilterSheetProps) {
  const idPrefix = useId()
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
  const parseOptionalYear = (value: string): number | null => (value === '' ? null : Number(value))
  const invalidPlantingYearRange = hasInvalidPlantingYearRange(filters)
  const plantingYearErrorId = `${idPrefix}-planting-year-error`

  return (
    <MobileBottomSheet open={open} ariaLabel="Suodattimet" onClose={onClose}>
      <div className="mobile-filter-sheet">
        <header className="mobile-filter-sheet__header">
          <h2>Suodattimet</h2>
          <button type="button" className="mobile-filter-sheet__reset" onClick={onReset}>
            Tyhjennä
          </button>
        </header>

        <div className="mobile-filter-sheet__fields">
          <label htmlFor={`${idPrefix}-category`}>
            <span>Näytä</span>
            <select
              id={`${idPrefix}-category`}
              value={filters.fruitCategory}
              onChange={(event) => updateFruitCategory(event.target.value as FruitCategoryFilter)}
            >
              <option value="">Kaikki puut</option>
              {FRUIT_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label htmlFor={`${idPrefix}-main-type`}>
            <span>Puutyyppi</span>
            <select
              id={`${idPrefix}-main-type`}
              value={filters.mainType}
              onChange={(event) => update('mainType', event.target.value)}
            >
              <option value="">Kaikki</option>
              {options.mainTypes.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>

          <label htmlFor={`${idPrefix}-species`}>
            <span>Laji</span>
            <select
              id={`${idPrefix}-species`}
              value={filters.species}
              onChange={(event) => update('species', event.target.value)}
            >
              <option value="">Kaikki</option>
              {options.species.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>

          <fieldset className="mobile-filter-sheet__year-range">
            <legend>Istutusvuosi</legend>
            <div className="mobile-filter-sheet__year-inputs">
              <label htmlFor={`${idPrefix}-year-from`}>
                <span className="sr-only">Istutusvuosi alkaen</span>
                <input
                  id={`${idPrefix}-year-from`}
                  type="number"
                  step="1"
                  inputMode="numeric"
                  value={filters.plantingYearFrom ?? ''}
                  onChange={(event) => update('plantingYearFrom', parseOptionalYear(event.target.value))}
                  aria-invalid={invalidPlantingYearRange}
                  aria-describedby={invalidPlantingYearRange ? plantingYearErrorId : undefined}
                />
              </label>
              <span className="mobile-filter-sheet__year-separator" aria-hidden="true">–</span>
              <label htmlFor={`${idPrefix}-year-to`}>
                <span className="sr-only">Istutusvuosi asti</span>
                <input
                  id={`${idPrefix}-year-to`}
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
              <p id={plantingYearErrorId} className="mobile-filter-sheet__validation" role="status">
                Alkuvuosi ei voi olla loppuvuotta suurempi.
              </p>
            ) : null}
          </fieldset>
        </div>

        <footer className="mobile-filter-sheet__footer">
          <p role="status" aria-live="polite">
            {loading ? (
              'Ladataan puutietoja…'
            ) : error ? (
              error
            ) : (
              <><strong>{resultCount.toLocaleString('fi-FI')}</strong> puuta kartalla</>
            )}
          </p>
          <button type="button" onClick={onOpenInfo} aria-label="Tietoja puuaineistosta">
            <InfoIcon />
          </button>
        </footer>
      </div>
    </MobileBottomSheet>
  )
}
