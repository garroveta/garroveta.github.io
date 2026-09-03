import { useCallback, useEffect, useState } from 'react'

import { getCommunityRegistrationSettings } from '../api/communityRegistrationSettings'
import type { CommunityRegistrationSettings } from '../domain/types'

export type CommunityRegistrationSettingsStatus =
  'idle' | 'loading' | 'ready' | 'error'

type UseCommunityRegistrationSettingsOptions = {
  communityId: string
  enabled: boolean
  onLoaded: (settings: CommunityRegistrationSettings) => void
}

export function useCommunityRegistrationSettings({
  communityId,
  enabled,
  onLoaded,
}: UseCommunityRegistrationSettingsOptions) {
  const [status, setStatus] = useState<CommunityRegistrationSettingsStatus>(
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

    void getCommunityRegistrationSettings(communityId, controller.signal)
      .then(({ registrationSettings }) => {
        if (!isCurrentRequest) {
          return
        }

        onLoaded(registrationSettings)
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
