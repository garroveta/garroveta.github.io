import { useCallback, useEffect, useState } from 'react'

import { getCommunityBadgeSettings } from '../api/communityBadgeSettings'
import type { CommunityBadgeSettings } from '../domain/types'

export type CommunityBadgeSettingsStatus =
  'idle' | 'loading' | 'ready' | 'error'

type UseCommunityBadgeSettingsOptions = {
  communityId: string
  enabled: boolean
  onLoaded: (settings: CommunityBadgeSettings) => void
}

export function useCommunityBadgeSettings({
  communityId,
  enabled,
  onLoaded,
}: UseCommunityBadgeSettingsOptions) {
  const [status, setStatus] = useState<CommunityBadgeSettingsStatus>(
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

    void getCommunityBadgeSettings(communityId, controller.signal)
      .then(({ badgeSettings }) => {
        if (!isCurrentRequest) {
          return
        }

        onLoaded(badgeSettings)
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
