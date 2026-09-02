import { useCallback, useEffect, useState } from 'react'

import {
  getCommunitySettings,
  type PersistedCommunitySettings,
} from '../api/communitySettings'

export type CommunitySettingsStatus = 'idle' | 'loading' | 'ready' | 'error'

type UseCommunitySettingsOptions = {
  communityId: string
  enabled: boolean
  onLoaded: (community: PersistedCommunitySettings) => void
}

export function useCommunitySettings({
  communityId,
  enabled,
  onLoaded,
}: UseCommunitySettingsOptions) {
  const [status, setStatus] = useState<CommunitySettingsStatus>(
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

    void getCommunitySettings(communityId, controller.signal)
      .then(({ community }) => {
        if (!isCurrentRequest) {
          return
        }

        onLoaded(community)
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
