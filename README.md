# Trees Helsinki

Trees Helsinki is a web application for exploring Helsinki's public tree registry on an interactive map.

The project is intentionally starting as a static client application. The planned implementation uses React, TypeScript, Vite, MapLibre GL JS, and a generated GeoJSON snapshot derived from Helsinki open data.

## Project status

The repository currently contains only the project baseline. Application initialization is tracked in GitHub issue #1.

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
