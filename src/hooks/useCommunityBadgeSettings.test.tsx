import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getCommunityBadgeSettings } from '../api/communityBadgeSettings'
import { demoData } from '../data/demoData'
import { useCommunityBadgeSettings } from './useCommunityBadgeSettings'

vi.mock('../api/communityBadgeSettings', () => ({
  getCommunityBadgeSettings: vi.fn(),
}))

describe('useCommunityBadgeSettings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads settings for an approved community member', async () => {
    const onLoaded = vi.fn()
    vi.mocked(getCommunityBadgeSettings).mockResolvedValue({
      badgeSettings: demoData.badgeSettings,
    })

    const { result } = renderHook(() =>
      useCommunityBadgeSettings({
        communityId: demoData.community.id,
        enabled: true,
        onLoaded,
      }),
    )

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(onLoaded).toHaveBeenCalledWith(demoData.badgeSettings)
    expect(getCommunityBadgeSettings).toHaveBeenCalledWith(
      demoData.community.id,
      expect.any(AbortSignal),
    )
  })

  it('exposes an error and retries the request', async () => {
    const onLoaded = vi.fn()
    const requestError = new Error('Offline')
    vi.mocked(getCommunityBadgeSettings)
      .mockRejectedValueOnce(requestError)
      .mockResolvedValueOnce({
        badgeSettings: demoData.badgeSettings,
      })

    const { result } = renderHook(() =>
      useCommunityBadgeSettings({
        communityId: demoData.community.id,
        enabled: true,
        onLoaded,
      }),
    )

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe(requestError)
    act(() => result.current.reload())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(getCommunityBadgeSettings).toHaveBeenCalledTimes(2)
  })

  it('remains idle until community access is available', () => {
    const { result } = renderHook(() =>
      useCommunityBadgeSettings({
        communityId: demoData.community.id,
        enabled: false,
        onLoaded: vi.fn(),
      }),
    )

    act(() => result.current.reload())

    expect(result.current.status).toBe('idle')
    expect(getCommunityBadgeSettings).not.toHaveBeenCalled()
  })
})
