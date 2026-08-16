# Trees Helsinki

Trees Helsinki is a web application for exploring Helsinki's public tree registry on an interactive map.

The application uses React, TypeScript, Vite, and MapLibre GL JS. It starts as a static client application; later issues will add a generated GeoJSON snapshot derived from Helsinki open data.

## Project status

The web application foundation is initialized. The current UI shows an interactive Helsinki map using MapLibre GL JS and an OpenFreeMap basemap. Tree-registry ingestion and tree rendering are intentionally tracked separately.

## Local development

Requires Node.js >=22.12.0.

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run check
npm run build
```

## Product direction

- Browse registered trees on a map.
- Search and filter source-backed tree properties.
- Add clearly separated application-owned classifications for useful categories.
- Use browser geolocation for nearby trees.
- Save trees locally in the browser.
- Keep hosting and data refresh static and free-first.

The initial architecture does not require a custom backend, database, authentication, or server-side rendering.

## Data

Tree data will come from the City of Helsinki open tree registry. Source fields and application-derived classifications are kept separate, and generated live registry snapshots are treated as build artifacts rather than normal Git history.

Attribution and source licensing information will be shown alongside published data.
