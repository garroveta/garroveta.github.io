import { useCallback, useEffect, useState } from 'react'

import { listCommunityEvents } from '../api/communityEvents'
import type { CommunityEvent } from '../domain/types'

export type CommunityEventsStatus = 'idle' | 'loading' | 'ready' | 'error'

type UseCommunityEventsOptions = {
  communityId: string
  enabled: boolean
  onLoaded: (events: CommunityEvent[]) => void
}

export function useCommunityEvents({
  communityId,
  enabled,
  onLoaded,
}: UseCommunityEventsOptions) {
  const [status, setStatus] = useState<CommunityEventsStatus>(
    enabled ? 'loading' : 'idle',
  )
  const [reloadRevision, setReloadRevision] = useState(0)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const controller = new AbortController()
    let isCurrentRequest = true

    void listCommunityEvents(communityId, controller.signal)
      .then(({ events }) => {
        if (!isCurrentRequest) {
          return
        }

        onLoaded(events)
        setStatus('ready')
      })
      .catch(() => {
        if (isCurrentRequest && !controller.signal.aborted) {
          setStatus('error')
        }
      })

    return () => {
      isCurrentRequest = false
      controller.abort()
    }
  }, [communityId, enabled, onLoaded, reloadRevision])

  const reload = useCallback(() => {
    setStatus('loading')
    setReloadRevision((revision) => revision + 1)
  }, [])

  return {
    reload,
    status:
      enabled && status === 'idle' ? 'loading' : enabled ? status : 'idle',
  }
}
