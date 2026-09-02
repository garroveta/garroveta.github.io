import { useCallback, useEffect, useRef, useState } from 'react'

import { ClientApiError } from '../api/client'
import { getCurrentUser, type CurrentUser } from '../api/currentUser'

type CurrentUserState =
  | {
      data: null
      error?: unknown
      status: 'error' | 'loading' | 'unauthenticated'
    }
  | { data: CurrentUser; status: 'authenticated' }

export const CURRENT_USER_REFRESH_INTERVAL_MS = 5 * 60 * 1000
const RESUME_REFRESH_DELAY_MS = 50

export function useCurrentUser() {
  const [state, setState] = useState<CurrentUserState>({
    data: null,
    status: 'loading',
  })
  const latestRequestId = useRef(0)

  const loadCurrentUser = useCallback((signal?: AbortSignal) => {
    const requestId = ++latestRequestId.current

    return getCurrentUser(signal)
      .then((data) => {
        if (signal?.aborted || requestId !== latestRequestId.current) {
          return null
        }

        setState({ data, status: 'authenticated' })
        return data
      })
      .catch((error: unknown) => {
        if (
          signal?.aborted ||
          requestId !== latestRequestId.current ||
          (error instanceof DOMException && error.name === 'AbortError')
        ) {
          return null
        }

        const isUnauthenticated =
          error instanceof ClientApiError && error.status === 401

        setState({
          data: null,
          error: isUnauthenticated ? undefined : error,
          status: isUnauthenticated ? 'unauthenticated' : 'error',
        })
        return null
      })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void loadCurrentUser(controller.signal)

    return () => controller.abort()
  }, [loadCurrentUser])

  useEffect(() => {
    let controller: AbortController | undefined
    let resumeTimer: number | undefined

    const refresh = () => {
      controller?.abort()
      controller = new AbortController()
      void loadCurrentUser(controller.signal)
    }
    const scheduleResumeRefresh = () => {
      window.clearTimeout(resumeTimer)
      resumeTimer = window.setTimeout(refresh, RESUME_REFRESH_DELAY_MS)
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleResumeRefresh()
      }
    }
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }, CURRENT_USER_REFRESH_INTERVAL_MS)

    window.addEventListener('focus', scheduleResumeRefresh)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      controller?.abort()
      window.clearInterval(interval)
      window.clearTimeout(resumeTimer)
      window.removeEventListener('focus', scheduleResumeRefresh)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [loadCurrentUser])

  return {
    ...state,
    refresh: loadCurrentUser,
  }
}
