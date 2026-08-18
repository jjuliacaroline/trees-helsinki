# Trees Helsinki

Trees Helsinki is a web application for exploring Helsinki's public tree registry on an interactive map.

The application uses React, TypeScript, Vite, and MapLibre GL JS. It starts as a static client application, with a generated GeoJSON snapshot derived from Helsinki open data.

## Project status

The web application foundation is initialized and the repository includes a tested ingestion path for Helsinki's public tree registry. Rendering registered trees on the map is tracked separately.

## Local development

Requires Node.js >=22.12.0.

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run check
npm test
npm run build
```

Browser smoke tests use Playwright with a small deterministic tree fixture rather than the live Helsinki registry. Install the Chromium test browser once, then run the suite with:

```bash
npx playwright install chromium
npm run test:e2e
```

## Tree data

The source is the City of Helsinki `Puurekisteri_piste` WFS layer. Fetch the current registry snapshot with:

```bash
npm run data:fetch
```

The ingestion script requests GeoJSON from WFS 2.0 in WGS84 / EPSG:4326, validates the documented registry fields and point geometry, pages through the source deterministically by tree id, and writes the sorted result to:

```text
public/data/trees.geojson
```

The generated live snapshot is intentionally gitignored and should not be committed as normal repository history. Small source-like fixtures are committed only for deterministic tests.

The registry contains public street and park trees and is not a complete inventory of every tree in Helsinki. Source records can also contain missing or inaccurate values, so unknown optional values remain `null` rather than being invented by the application.

## Product direction

- Browse registered trees on a map.
- Search and filter source-backed tree properties.
- Add clearly separated application-owned classifications for useful categories.
- Use browser geolocation for nearby trees.
- Save trees locally in the browser.
- Keep hosting and data refresh static and free-first.

The initial architecture does not require a custom backend, database, authentication, or server-side rendering.

## Data

Tree data comes from the City of Helsinki open tree registry. Source fields and application-derived classifications are kept separate, and generated live registry snapshots are treated as build artifacts rather than normal Git history.

Attribution and source licensing information will be shown alongside published data.
