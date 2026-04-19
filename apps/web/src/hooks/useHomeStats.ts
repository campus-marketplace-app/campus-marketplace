import { useQuery } from '@tanstack/react-query'
import { getHomeStats } from '@campus-marketplace/backend'
import type { HomeStats } from '@campus-marketplace/backend'

const HOME_STATS_STALE_TIME = 5 * 60 * 1000

export function useHomeStats(): { stats: HomeStats | undefined; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['stats', 'home'],
    queryFn: getHomeStats,
    staleTime: HOME_STATS_STALE_TIME,
  })
  return { stats: data, isLoading }
}
