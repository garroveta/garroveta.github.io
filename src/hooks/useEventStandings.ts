import { useCallback, useEffect, useState } from 'react'

import { listCommunityEventStandings } from '../api/eventStandings'
import type { EventStanding } from '../domain/types'

export type EventStandingsStatus = 'idle' | 'loading' | 'ready' | 'error'

type UseEventStandingsOptions = {
  communityId: string
  enabled: boolean
  onLoaded: (standings: EventStanding[]) => void
}

export function useEventStandings({
  communityId,
  enabled,
  onLoaded,
}: UseEventStandingsOptions) {
  const [status, setStatus] = useState<EventStandingsStatus>(
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

    void listCommunityEventStandings(communityId, controller.signal)
      .then(({ standings }) => {
        if (!isCurrentRequest) {
          return
        }

        onLoaded(standings)
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
