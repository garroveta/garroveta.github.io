import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ClientApiError } from '../api/client'
import { getCurrentUser, type CurrentUser } from '../api/currentUser'
import {
  CURRENT_USER_REFRESH_INTERVAL_MS,
  useCurrentUser,
} from './useCurrentUser'

vi.mock('../api/currentUser', () => ({
  getCurrentUser: vi.fn(),
}))

const player: CurrentUser = {
  memberships: [
    {
      community: {
        city: 'Inca',
        id: 'community-crc-delorean',
        name: 'CRC Delorean',
        slug: 'crc-delorean',
      },
      displayName: 'Marina Valverde',
      favoriteGameIds: ['game-mtg'],
      id: 'member-player',
      joinedAt: '2026-09-01T10:00:00.000Z',
      role: 'player',
      status: 'approved',
      tagIds: ['tag-pauper'],
    },
  ],
  user: {
    email: 'marina@example.com',
    id: 'user-player',
    name: 'Marina Valverde',
  },
}

describe('useCurrentUser', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('refreshes the membership after returning to the application', async () => {
    const suspendedPlayer: CurrentUser = {
      ...player,
      memberships: [{ ...player.memberships[0]!, status: 'suspended' }],
    }
    vi.mocked(getCurrentUser)
      .mockResolvedValueOnce(player)
      .mockResolvedValueOnce(suspendedPlayer)
    const { result } = renderHook(() => useCurrentUser())

    await waitFor(() => expect(result.current.status).toBe('authenticated'))

    act(() => {
      window.dispatchEvent(new Event('focus'))
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await waitFor(() =>
      expect(result.current.data?.memberships[0]?.status).toBe('suspended'),
    )
    expect(getCurrentUser).toHaveBeenCalledTimes(2)
  })

  it('periodically refreshes an open application', async () => {
    vi.useFakeTimers()
    const manager: CurrentUser = {
      ...player,
      memberships: [{ ...player.memberships[0]!, role: 'manager' }],
    }
    vi.mocked(getCurrentUser)
      .mockResolvedValueOnce(player)
      .mockResolvedValueOnce(manager)
    const { result } = renderHook(() => useCurrentUser())

    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.data?.memberships[0]?.role).toBe('player')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(CURRENT_USER_REFRESH_INTERVAL_MS)
    })

    expect(result.current.data?.memberships[0]?.role).toBe('manager')
    expect(getCurrentUser).toHaveBeenCalledTimes(2)
  })

  it('moves to the access screen when the refreshed session has expired', async () => {
    vi.mocked(getCurrentUser)
      .mockResolvedValueOnce(player)
      .mockRejectedValueOnce(
        new ClientApiError(401, 'authentication_required', 'Sign in.'),
      )
    const { result } = renderHook(() => useCurrentUser())

    await waitFor(() => expect(result.current.status).toBe('authenticated'))

    await act(async () => {
      await result.current.refresh()
    })

    expect(result.current.status).toBe('unauthenticated')
    expect(result.current.data).toBeNull()
  })

  it('exposes the underlying error for an unexpected failure', async () => {
    const requestError = new ClientApiError(0, 'network_error', 'Offline')
    vi.mocked(getCurrentUser).mockRejectedValueOnce(requestError)
    const { result } = renderHook(() => useCurrentUser())

    await waitFor(() => expect(result.current.status).toBe('error'))
    const state = result.current
    expect(state.status === 'error' && state.error).toBe(requestError)
  })
})
