# Trees Helsinki

Trees Helsinki is a web application for exploring Helsinki's public tree registry on an interactive map.

The application uses React, TypeScript, Vite, and MapLibre GL JS. It is a static client application with a generated GeoJSON snapshot derived from Helsinki open data.

## Project status

The current application includes the map experience, source-backed tree data, local saved trees, browser-based nearby-tree lookup, and automated GitHub Pages deployment with a daily production data refresh.

## Features

- Explore the Helsinki tree registry on an interactive map.
- Ingest and validate the City of Helsinki tree registry as GeoJSON.
- Search and filter source-backed tree properties.
- Apply separate Trees Helsinki classifications, including fruit categories.
- Request browser geolocation to find nearby trees after explicit user action.
- Save stable numeric tree IDs locally in the browser.
- Run unit tests, browser smoke tests, type checks, and a production build in GitHub Actions CI.
- Refresh the live tree snapshot and deploy the static application through GitHub Pages.

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

The same ingestion run writes generated snapshot metadata, including the generation time and latest parseable source update value found in the registry, to:

```text
public/data/generated/tree-metadata.json
```

The generated live snapshot and metadata are intentionally gitignored and should not be committed as normal repository history. Small source-like fixtures are committed only for deterministic tests.

The registry contains public street and park trees and is not a complete inventory of every tree in Helsinki. Source records can also contain missing or inaccurate values, so unknown optional values remain `null` rather than being invented by the application.

## CI and GitHub Pages deployment

Pull-request validation and production deployment are deliberately separate.

`.github/workflows/ci.yml` runs deterministic code validation for pull requests and pushes to `main`. It installs dependencies, runs type checks and unit tests, executes Playwright smoke tests against committed fixture data, and builds the application. Normal CI does not fetch the live Helsinki WFS service, so pull requests are not coupled to upstream data availability.

`.github/workflows/deploy.yml` owns production data refresh and GitHub Pages publishing. It runs on pushes to `main`, on a daily schedule, and through manual `workflow_dispatch`. The production build job:

1. installs dependencies and runs the repository checks and tests;
2. fetches and validates the current Helsinki tree registry with `npm run data:fetch`;
3. builds Vite with the `/trees-helsinki/` GitHub Pages repository base path;
4. uploads the complete `dist` directory as the Pages artifact.

A separate deployment job depends on the build job and publishes only that completed artifact. If source fetching, validation, tests, or the build fail, deployment does not run and the existing published site is left in place.

Before the first deployment, configure the repository once in **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**. The workflow then uses the repository `GITHUB_TOKEN`; no personal access token or deployment secret is needed.

The scheduled refresh produces deployment artifacts only. It does not create a daily Git commit containing the generated tree dataset.

For local development, run `npm run data:fetch` when you need a fresh live dataset. The normal Vite development server continues to use the root base path rather than the GitHub Pages repository path.

## Product direction

- Keep hosting and data refresh static and free-first.

The architecture does not require a custom backend, database, authentication, or server-side rendering.

## Licensing and attribution

The application source code is licensed under the [MIT License](LICENSE). That license applies to this repository's source code, not to external data or map resources.

Tree data comes from the [City of Helsinki open tree registry](https://hri.fi/data/en_GB/dataset/helsingin-kaupungin-puurekisteri) and is credited under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The application displays the source, license credit, generated snapshot time, available source update information, and a coverage/data-quality notice alongside the map.

The basemap is provided by [OpenFreeMap](https://openfreemap.org/). Its upstream map data comes from [OpenStreetMap](https://www.openstreetmap.org/), so the map's upstream attribution and licensing terms apply separately from this repository's MIT license.

Source fields and application-derived classifications are kept separate, and generated live registry snapshots are treated as build artifacts rather than normal Git history.
