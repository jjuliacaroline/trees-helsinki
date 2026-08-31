# Mobile UI references

These screenshots are the authoritative visual references for the
Trees Helsinki mobile UI.

Do not redesign, reinterpret, add controls, or independently improve
the visual hierarchy unless explicitly requested.

## Views

### trees-map-view.png
Default mobile map state.

### trees-map-filter.png
Mobile map with the filter bottom sheet open.

### trees-selected-tree-info.png
Mobile state after selecting an individual tree.

### trees-fav-list.png
Saved trees view.

### privacy-pol-trees.png
Data and source information view.

## Implementation rules

- Preserve existing application functionality.
- Match the screenshots closely in layout, hierarchy, spacing, and control placement.
- Screenshot values such as tree counts, dates, distances, and example species are illustrative and must not be hardcoded.
- Tree photos shown in mockups are illustrative only. Do not add an external photo API or invent a photo source solely to reproduce them.
- Desktop layout is outside the visual scope of these screenshots and must not regress.
- Mobile layout must be responsive across approximately 320–430 px viewport widths rather than hardcoded to one device size.