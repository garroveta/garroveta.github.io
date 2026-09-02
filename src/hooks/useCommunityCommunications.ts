import { useCallback, useEffect, useState } from 'react'

import {
  listCommunityCommunications,
  type CommunityCommunication,
} from '../api/communityCommunications'

export type CommunityCommunicationsStatus =
  'idle' | 'loading' | 'ready' | 'error'

type UseCommunityCommunicationsOptions = {
  communityId: string
  enabled: boolean
  onLoaded: (communications: CommunityCommunication[]) => void
}

export function useCommunityCommunications({
  communityId,
  enabled,
  onLoaded,
}: UseCommunityCommunicationsOptions) {
  const [status, setStatus] = useState<CommunityCommunicationsStatus>(
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

    void listCommunityCommunications(communityId, controller.signal)
      .then(({ communications }) => {
        if (!isCurrentRequest) {
          return
        }

        onLoaded(communications)
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
