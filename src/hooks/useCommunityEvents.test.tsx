import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listCommunityEvents } from '../api/communityEvents'
import { demoData } from '../data/demoData'
import { useCommunityEvents } from './useCommunityEvents'

vi.mock('../api/communityEvents', () => ({
  listCommunityEvents: vi.fn(),
}))

describe('useCommunityEvents', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads persisted events for an approved community member', async () => {
    const events = demoData.events.slice(0, 2)
    const onLoaded = vi.fn()
    vi.mocked(listCommunityEvents).mockResolvedValue({
      events,
      registrations: [],
    })

    const { result } = renderHook(() =>
      useCommunityEvents({
        communityId: demoData.community.id,
        enabled: true,
        onLoaded,
      }),
    )

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(onLoaded).toHaveBeenCalledWith(events, [])
    expect(listCommunityEvents).toHaveBeenCalledWith(
      demoData.community.id,
      expect.any(AbortSignal),
    )
  })

  it('exposes an error and retries the agenda request', async () => {
    const onLoaded = vi.fn()
    vi.mocked(listCommunityEvents)
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce({ events: [], registrations: [] })

    const { result } = renderHook(() =>
      useCommunityEvents({
        communityId: demoData.community.id,
        enabled: true,
        onLoaded,
      }),
    )

    await waitFor(() => expect(result.current.status).toBe('error'))
    act(() => result.current.reload())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    expect(listCommunityEvents).toHaveBeenCalledTimes(2)
    expect(onLoaded).toHaveBeenCalledWith([], [])
  })

  it('does not load events without an approved membership', () => {
    const { result } = renderHook(() =>
      useCommunityEvents({
        communityId: demoData.community.id,
        enabled: false,
        onLoaded: vi.fn(),
      }),
    )

    expect(result.current.status).toBe('idle')
    expect(listCommunityEvents).not.toHaveBeenCalled()
  })
})
