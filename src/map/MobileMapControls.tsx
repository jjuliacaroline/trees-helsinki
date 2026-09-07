import type { LocationStatus } from './TreeFilterPanel'
import './mobileMapControls.css'

interface MobileMapControlsProps {
  search: string
  resultCount: number
  loading: boolean
  error: string | null
  savedCount: number
  savedActive: boolean
  activeFilterCount: number
  filtersOpen: boolean
  locationStatus: LocationStatus
  onSearchChange: (value: string) => void
  onToggleSaved: () => void
  onRequestLocation: () => void
  onOpenFilters: () => void
  onOpenInfo: () => void
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.25 4.25" />
    </svg>
  )
}

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4.5h10a1 1 0 0 1 1 1v15l-6-3.75L6 20.5v-15a1 1 0 0 1 1-1Z" />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="8" />
      <path d="M12 1v3M12 20v3M1 12h3M20 12h3" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h6M14 7h6M4 17h10M18 17h2M4 12h2M10 12h10" />
      <circle cx="12" cy="7" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="16" cy="17" r="2" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10.5v6M12 7.5h.01" />
    </svg>
  )
}

function locationLabel(status: LocationStatus): string {
  switch (status) {
    case 'requesting':
      return 'Haetaan sijaintia'
    case 'ready':
      return 'Päivitä sijainti'
    case 'denied':
      return 'Sijaintilupaa ei annettu. Yritä uudelleen'
    case 'unavailable':
      return 'Sijainti ei ole käytettävissä'
    default:
      return 'Käytä sijaintiani'
  }
}

export function MobileMapControls({
  search,
  resultCount,
  loading,
  error,
  savedCount,
  savedActive,
  activeFilterCount,
  filtersOpen,
  locationStatus,
  onSearchChange,
  onToggleSaved,
  onRequestLocation,
  onOpenFilters,
  onOpenInfo,
}: MobileMapControlsProps) {
  return (
    <div className={`mobile-map-controls${filtersOpen ? ' is-filter-sheet-open' : ''}`} aria-label="Mobiilikartan toiminnot">
      <div className="mobile-map-controls__top">
        <label className="mobile-map-controls__search">
          <span className="sr-only">Hae puita kartalta</span>
          <SearchIcon />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Hae puita…"
            aria-label="Hae puita kartalta"
          />
        </label>
        <button
          type="button"
          className={`mobile-map-controls__icon-button mobile-map-controls__saved${savedActive ? ' is-active' : ''}`}
          onClick={onToggleSaved}
          aria-label={`Tallennetut puut, ${savedCount}`}
          aria-pressed={savedActive}
        >
          <BookmarkIcon />
          {savedCount > 0 ? <span className="mobile-map-controls__badge">{savedCount}</span> : null}
        </button>
      </div>

      <button
        type="button"
        className={`mobile-map-controls__icon-button mobile-map-controls__location is-${locationStatus}`}
        onClick={onRequestLocation}
        disabled={locationStatus === 'requesting'}
        aria-label={locationLabel(locationStatus)}
      >
        <LocationIcon />
      </button>

      <button
        type="button"
        className="mobile-map-controls__filters"
        onClick={onOpenFilters}
        aria-label={`Suodattimet, ${activeFilterCount} aktiivista`}
        aria-expanded={filtersOpen}
      >
        <FilterIcon />
        <span>Suodattimet</span>
        {activeFilterCount > 0 ? <span className="mobile-map-controls__filter-count">{activeFilterCount}</span> : null}
      </button>

      <section className="mobile-map-controls__peek" aria-label="Karttatulokset">
        <p role="status" aria-live="polite">
          {loading ? (
            'Ladataan puutietoja…'
          ) : error ? (
            error
          ) : (
            <><strong>{resultCount.toLocaleString('fi-FI')}</strong> puuta<span className="sr-only"> kartalla</span></>
          )}
        </p>
        <button type="button" onClick={onOpenInfo} aria-label="Tietoja puuaineistosta">
          <InfoIcon />
        </button>
      </section>
    </div>
  )
}
