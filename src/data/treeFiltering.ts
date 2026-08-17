import type { HelsinkiTreeFeature } from './treeRegistry'

export interface TreeFilters {
  search: string
  genus: string
  species: string
  mainType: string
  plantingYear: number | null
  sizeClass: string
}

export interface TreeFilterOptions {
  genera: string[]
  species: string[]
  mainTypes: string[]
  plantingYears: number[]
  sizeClasses: string[]
}

export interface SearchableTree {
  tree: HelsinkiTreeFeature
  searchText: string
}

export const EMPTY_TREE_FILTERS: TreeFilters = {
  search: '',
  genus: '',
  species: '',
  mainType: '',
  plantingYear: null,
  sizeClass: '',
}

const collator = new Intl.Collator('fi', { sensitivity: 'base' })

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase('fi-FI')
}

function buildSearchText(tree: HelsinkiTreeFeature): string {
  const { properties } = tree
  const scientificName = [properties.suku, properties.laji].filter(Boolean).join(' ')
  const values = [
    properties.suomenknimi,
    properties.suku,
    properties.laji,
    scientificName,
    properties.kadunnimi,
    properties.puistonnimi,
    properties.tunnus,
    String(properties.id),
  ]

  return values
    .filter((value): value is string => value !== null)
    .map(normalized)
    .join('\u0000')
}

export function buildTreeSearchIndex(
  trees: readonly HelsinkiTreeFeature[],
): SearchableTree[] {
  return trees.map((tree) => ({
    tree,
    searchText: buildSearchText(tree),
  }))
}

export function filterTrees(
  trees: readonly HelsinkiTreeFeature[],
  filters: TreeFilters,
  searchIndex: readonly SearchableTree[] = buildTreeSearchIndex(trees),
): HelsinkiTreeFeature[] {
  const searchQuery = normalized(filters.search)

  return searchIndex
    .filter(({ tree, searchText }) => {
      if (!tree.geometry) {
        return false
      }

      const { properties } = tree

      return (
        (!searchQuery || searchText.includes(searchQuery)) &&
        (!filters.genus || properties.suku === filters.genus) &&
        (!filters.species || properties.laji === filters.species) &&
        (!filters.mainType || properties.paatyyppi === filters.mainType) &&
        (filters.plantingYear === null || properties.istutusvuosi === filters.plantingYear) &&
        (!filters.sizeClass || properties.kokoluokka === filters.sizeClass)
      )
    })
    .map(({ tree }) => tree)
}

function uniqueStrings(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort(collator.compare)
}

export function buildTreeFilterOptions(
  trees: readonly HelsinkiTreeFeature[],
  selectedGenus = '',
): TreeFilterOptions {
  const mappableTrees = trees.filter((tree) => tree.geometry)
  const speciesTrees = selectedGenus
    ? mappableTrees.filter((tree) => tree.properties.suku === selectedGenus)
    : mappableTrees

  const plantingYears = [
    ...new Set(
      mappableTrees
        .map((tree) => tree.properties.istutusvuosi)
        .filter((value): value is number => value !== null),
    ),
  ].sort((left, right) => right - left)

  return {
    genera: uniqueStrings(mappableTrees.map((tree) => tree.properties.suku)),
    species: uniqueStrings(speciesTrees.map((tree) => tree.properties.laji)),
    mainTypes: uniqueStrings(mappableTrees.map((tree) => tree.properties.paatyyppi)),
    plantingYears,
    sizeClasses: uniqueStrings(mappableTrees.map((tree) => tree.properties.kokoluokka)),
  }
}

export function hasActiveTreeFilters(filters: TreeFilters): boolean {
  return (
    Boolean(filters.search.trim()) ||
    Boolean(filters.genus) ||
    Boolean(filters.species) ||
    Boolean(filters.mainType) ||
    filters.plantingYear !== null ||
    Boolean(filters.sizeClass)
  )
}
