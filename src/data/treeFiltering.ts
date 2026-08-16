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

function matchesSearch(tree: HelsinkiTreeFeature, query: string): boolean {
  if (!query) {
    return true
  }

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

  return values.some((value) => value !== null && normalized(value).includes(query))
}

export function filterTrees(
  trees: readonly HelsinkiTreeFeature[],
  filters: TreeFilters,
): HelsinkiTreeFeature[] {
  const searchQuery = normalized(filters.search)

  return trees.filter((tree) => {
    if (!tree.geometry) {
      return false
    }

    const { properties } = tree

    return (
      matchesSearch(tree, searchQuery) &&
      (!filters.genus || properties.suku === filters.genus) &&
      (!filters.species || properties.laji === filters.species) &&
      (!filters.mainType || properties.paatyyppi === filters.mainType) &&
      (filters.plantingYear === null || properties.istutusvuosi === filters.plantingYear) &&
      (!filters.sizeClass || properties.kokoluokka === filters.sizeClass)
    )
  })
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
