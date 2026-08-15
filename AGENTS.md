# Repository instructions

## Purpose

Trees Helsinki is a static-first web application for exploring Helsinki's public tree registry on a map.

## Working rules

- Work from the relevant GitHub issue and keep changes within its stated scope and acceptance criteria.
- Prefer the simplest architecture that satisfies the current requirement. Do not add a backend, database, authentication, server-side rendering, or a state-management framework without a concrete need.
- Treat Helsinki's tree registry as an external source of truth. Preserve source-backed fields faithfully and represent missing optional values instead of inventing replacements.
- Keep application-derived classifications separate from raw source data and centralize their rules rather than duplicating them across UI components.
- Do not commit full live generated tree-registry snapshots to normal Git history. Use small fixtures or samples for tests.
- Do not commit secrets, credentials, tokens, or unnecessary user-location data.
- Run the checks relevant to the change and report accurately what was and was not run.
- Keep commits logical and focused. Avoid unrelated refactors, speculative abstractions, and duplicated sources of truth.
