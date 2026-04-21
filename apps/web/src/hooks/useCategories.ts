import { useQuery } from '@tanstack/react-query'
import { getCategories } from '@campus-marketplace/backend'
import type { Category } from '@campus-marketplace/backend'

const CATEGORIES_STALE_TIME = 60 * 60 * 1000

export type { Category }

export function useCategories(): { categories: Category[]; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: CATEGORIES_STALE_TIME,
  })

  return { categories: data ?? [], isLoading }
}