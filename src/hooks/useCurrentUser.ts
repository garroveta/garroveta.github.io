import { useCallback, useEffect, useState } from 'react'

import { ClientApiError } from '../api/client'
import { getCurrentUser, type CurrentUser } from '../api/currentUser'

type CurrentUserState =
  | { data: null; status: 'error' | 'loading' | 'unauthenticated' }
  | { data: CurrentUser; status: 'authenticated' }

export function useCurrentUser() {
  const [state, setState] = useState<CurrentUserState>({
    data: null,
    status: 'loading',
  })

  const loadCurrentUser = useCallback(
    (signal?: AbortSignal) =>
      getCurrentUser(signal)
        .then((data) => {
          setState({ data, status: 'authenticated' })
          return data
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return null
          }

          setState({
            data: null,
            status:
              error instanceof ClientApiError && error.status === 401
                ? 'unauthenticated'
                : 'error',
          })
          return null
        }),
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    void loadCurrentUser(controller.signal)

    return () => controller.abort()
  }, [loadCurrentUser])

  return {
    ...state,
    refresh: loadCurrentUser,
  }
}
