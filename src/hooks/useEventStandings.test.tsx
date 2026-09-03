import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listCommunityEventStandings } from '../api/eventStandings'
import { demoData } from '../data/demoData'
import { useEventStandings } from './useEventStandings'

vi.mock('../api/eventStandings', () => ({
  listCommunityEventStandings: vi.fn(),
}))

const standings = demoData.eventStandings

describe('useEventStandings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads event standings for an approved community member', async () => {
    const onLoaded = vi.fn()
    vi.mocked(listCommunityEventStandings).mockResolvedValue({ standings })

    const { result } = renderHook(() =>
      useEventStandings({
        communityId: demoData.community.id,
        enabled: true,
        onLoaded,
      }),
    )

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(onLoaded).toHaveBeenCalledWith(standings)
    expect(listCommunityEventStandings).toHaveBeenCalledWith(
      demoData.community.id,
      expect.any(AbortSignal),
    )
  })

  it('exposes an error and reloads the standings on demand', async () => {
    const onLoaded = vi.fn()
    const requestError = new Error('Offline')
    vi.mocked(listCommunityEventStandings)
      .mockRejectedValueOnce(requestError)
      .mockResolvedValueOnce({ standings })

    const { result } = renderHook(() =>
      useEventStandings({
        communityId: demoData.community.id,
        enabled: true,
        onLoaded,
      }),
    )

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe(requestError)
    act(() => result.current.reload())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    expect(listCommunityEventStandings).toHaveBeenCalledTimes(2)
    expect(onLoaded).toHaveBeenCalledWith(standings)
  })

  it('remains idle until community access is available', () => {
    const { result } = renderHook(() =>
      useEventStandings({
        communityId: demoData.community.id,
        enabled: false,
        onLoaded: vi.fn(),
      }),
    )

    act(() => result.current.reload())

    expect(result.current.status).toBe('idle')
    expect(listCommunityEventStandings).not.toHaveBeenCalled()
  })
})
