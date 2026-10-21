import type { Category } from '@/types'

type CategoryRef = { id: string; name: string; sortOrder?: number }

export function readCategoryIds(d: { categoryIds?: string[]; categoryId?: string }): string[] {
  if (d.categoryIds?.length) return d.categoryIds
  return d.categoryId ? [d.categoryId] : []
}

export function readCategoryNames(d: { categoryNames?: string[]; categoryName?: string }): string[] {
  if (d.categoryNames?.length) return d.categoryNames
  if (!d.categoryName) return []
  return d.categoryName.split(',').map(s => s.trim()).filter(Boolean)
}

export function packDancerCategories(catalog: CategoryRef[], ids: string[]) {
  const selected = catalog
    .filter(c => ids.includes(c.id))
    .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.name.localeCompare(b.name, 'es'))
  return {
    categoryIds: selected.map(c => c.id),
    categoryNames: selected.map(c => c.name),
    categoryId: selected[0]?.id ?? '',
    categoryName: selected.map(c => c.name).join(', '),
  }
}

export function mergeCategory(catalog: Category[], currentIds: string[], addId: string) {
  return packDancerCategories(catalog, [...new Set([...currentIds, addId])])
}
