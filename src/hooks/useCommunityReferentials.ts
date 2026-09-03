import { useCallback, useEffect, useState } from 'react'

import { listCommunityReferentials } from '../api/communityReferentials'
import type { CommunityReferentials } from '../data/communityOptions'

export type CommunityReferentialsStatus = 'idle' | 'loading' | 'ready' | 'error'

type UseCommunityReferentialsOptions = {
  communityId: string
  enabled: boolean
  onLoaded: (referentials: CommunityReferentials) => void
}

export function useCommunityReferentials({
  communityId,
  enabled,
  onLoaded,
}: UseCommunityReferentialsOptions) {
  const [status, setStatus] = useState<CommunityReferentialsStatus>(
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

    void listCommunityReferentials(communityId, controller.signal)
      .then(({ referentials }) => {
        if (!isCurrentRequest) {
          return
        }

        onLoaded(referentials)
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
