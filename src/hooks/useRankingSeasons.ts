import { useCallback, useEffect, useState } from 'react'

import { listCommunityRankingSeasons } from '../api/rankingSeasons'
import type { CommunityRankingSeason } from '../domain/types'

export type RankingSeasonsStatus = 'idle' | 'loading' | 'ready' | 'error'

type UseRankingSeasonsOptions = {
  communityId: string
  enabled: boolean
  onLoaded: (seasons: CommunityRankingSeason[]) => void
}

export function useRankingSeasons({
  communityId,
  enabled,
  onLoaded,
}: UseRankingSeasonsOptions) {
  const [status, setStatus] = useState<RankingSeasonsStatus>(
    enabled ? 'loading' : 'idle',
  )
  const [error, setError] = useState<unknown>(null)
  const [reloadRevision, setReloadRevision] = useState(0)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const controller = new AbortController()
    let isCurrentRequest = true

    void listCommunityRankingSeasons(communityId, controller.signal)
      .then(({ seasons }) => {
        if (!isCurrentRequest) {
          return
        }

        onLoaded(seasons)
        setError(null)
        setStatus('ready')
      })
      .catch((requestError: unknown) => {
        if (isCurrentRequest && !controller.signal.aborted) {
          setError(requestError)
          setStatus('error')
        }
      })

    return () => {
      isCurrentRequest = false
      controller.abort()
    }
  }, [communityId, enabled, onLoaded, reloadRevision])

  const reload = useCallback(() => {
    if (!enabled) {
      return
    }

    setStatus('loading')
    setReloadRevision((revision) => revision + 1)
  }, [enabled])

  return {
    error,
    reload,
    status:
      enabled && status === 'idle' ? 'loading' : enabled ? status : 'idle',
  }
}
