# Trees Helsinki

Trees Helsinki is a web application for exploring Helsinki's public tree registry on an interactive map.

The application uses React, TypeScript, Vite, and MapLibre GL JS. It starts as a static client application, with a generated GeoJSON snapshot derived from Helsinki open data.

## Project status

The current application includes the map experience, source-backed tree data, local saved trees, and browser-based nearby-tree lookup.

## Features

- Explore the Helsinki tree registry on an interactive map.
- Ingest and validate the City of Helsinki tree registry as GeoJSON.
- Search and filter source-backed tree properties.
- Apply separate Trees Helsinki classifications, including fruit categories.
- Request browser geolocation to find nearby trees after explicit user action.
- Save stable numeric tree IDs locally in the browser.
- Run unit tests, browser smoke tests, type checks, and a production build in GitHub Actions CI.

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

- Keep hosting and data refresh static and free-first.

The initial architecture does not require a custom backend, database, authentication, or server-side rendering.

## Licensing and attribution

The application source code is licensed under the [MIT License](LICENSE). That license applies to this repository's source code, not to external data or map resources.

Tree data comes from the [City of Helsinki open tree registry](https://hri.fi/data/en_GB/dataset/helsingin-kaupungin-puurekisteri). It is external City of Helsinki open data; attribution and source licensing are handled separately under the source's current terms.

The basemap is provided by [OpenFreeMap](https://openfreemap.org/). Its upstream map data comes from [OpenStreetMap](https://www.openstreetmap.org/), so the map's upstream attribution and licensing terms apply separately from this repository's MIT license.

Source fields and application-derived classifications are kept separate, and generated live registry snapshots are treated as build artifacts rather than normal Git history.
