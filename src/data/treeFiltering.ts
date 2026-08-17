import {
  matchesFruitCategory,
  type FruitCategoryFilter,
} from './treeClassifications'
import type { HelsinkiTreeFeature } from './treeRegistry'

export interface TreeFilters {
  search: string
  fruitCategory: FruitCategoryFilter
  genus: string
  species: string
  mainType: string
  plantingYearFrom: number | null
  plantingYearTo: number | null
  sizeClass: string
}

export interface TreeFilterOptions {
  genera: string[]
  species: string[]
  mainTypes: string[]
  sizeClasses: string[]
}

export interface SearchableTree {
  tree: HelsinkiTreeFeature
  searchText: string
}

export const EMPTY_TREE_FILTERS: TreeFilters = {
  search: '',
  fruitCategory: '',
  genus: '',
  species: '',
  mainType: '',
  plantingYearFrom: null,
  plantingYearTo: null,
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

export function hasInvalidPlantingYearRange(
  filters: Pick<TreeFilters, 'plantingYearFrom' | 'plantingYearTo'>,
): boolean {
  return (
    filters.plantingYearFrom !== null &&
    filters.plantingYearTo !== null &&
    filters.plantingYearFrom > filters.plantingYearTo
  )
}

function matchesPlantingYear(
  plantingYear: number | null,
  filters: Pick<TreeFilters, 'plantingYearFrom' | 'plantingYearTo'>,
): boolean {
  const hasBound = filters.plantingYearFrom !== null || filters.plantingYearTo !== null

  if (!hasBound) {
    return true
  }

  if (plantingYear === null) {
    return false
  }

  return (
    (filters.plantingYearFrom === null || plantingYear >= filters.plantingYearFrom) &&
    (filters.plantingYearTo === null || plantingYear <= filters.plantingYearTo)
  )
}

export function filterTrees(
  trees: readonly HelsinkiTreeFeature[],
  filters: TreeFilters,
  searchIndex: readonly SearchableTree[] = buildTreeSearchIndex(trees),
): HelsinkiTreeFeature[] {
  if (hasInvalidPlantingYearRange(filters)) {
    return []
  }

  const searchQuery = normalized(filters.search)

  return searchIndex
    .filter(({ tree, searchText }) => {
      if (!tree.geometry) {
        return false
      }

      const { properties } = tree

      return (
        (!searchQuery || searchText.includes(searchQuery)) &&
        matchesFruitCategory(tree, filters.fruitCategory) &&
        (!filters.genus || properties.suku === filters.genus) &&
        (!filters.species || properties.laji === filters.species) &&
        (!filters.mainType || properties.paatyyppi === filters.mainType) &&
        matchesPlantingYear(properties.istutusvuosi, filters) &&
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
  fruitCategory: FruitCategoryFilter = '',
): TreeFilterOptions {
  const categoryTrees = trees.filter(
    (tree) => tree.geometry && matchesFruitCategory(tree, fruitCategory),
  )
  const speciesTrees = selectedGenus
    ? categoryTrees.filter((tree) => tree.properties.suku === selectedGenus)
    : categoryTrees

  return {
    genera: uniqueStrings(categoryTrees.map((tree) => tree.properties.suku)),
    species: uniqueStrings(speciesTrees.map((tree) => tree.properties.laji)),
    mainTypes: uniqueStrings(categoryTrees.map((tree) => tree.properties.paatyyppi)),
    sizeClasses: uniqueStrings(categoryTrees.map((tree) => tree.properties.kokoluokka)),
  }
}

export function hasActiveTreeFilters(filters: TreeFilters): boolean {
  return (
    Boolean(filters.search.trim()) ||
    Boolean(filters.fruitCategory) ||
    Boolean(filters.genus) ||
    Boolean(filters.species) ||
    Boolean(filters.mainType) ||
    filters.plantingYearFrom !== null ||
    filters.plantingYearTo !== null ||
    Boolean(filters.sizeClass)
  )
}
