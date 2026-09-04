import { useCallback, useEffect, useState } from 'react'

import { listCommunityMembers } from '../api/managerMembers'
import { toCommunityMember } from '../data/communityMembers'
import type { CommunityMember } from '../domain/types'

export type CommunityMembersStatus = 'idle' | 'loading' | 'ready' | 'error'

type UseCommunityMembersOptions = {
  communityId: string
  enabled: boolean
  onLoaded: (members: CommunityMember[]) => void
}

export function useCommunityMembers({
  communityId,
  enabled,
  onLoaded,
}: UseCommunityMembersOptions) {
  const [status, setStatus] = useState<CommunityMembersStatus>(
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

    void listCommunityMembers(communityId, controller.signal)
      .then(({ members }) => {
        if (!isCurrentRequest) {
          return
        }

        onLoaded(
          members.map((member) => toCommunityMember(member, communityId)),
        )
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
