import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getCommunitySettings,
  type PersistedCommunitySettings,
} from '../api/communitySettings'
import { demoData } from '../data/demoData'
import { useCommunitySettings } from './useCommunitySettings'

vi.mock('../api/communitySettings', () => ({
  getCommunitySettings: vi.fn(),
}))

const community: PersistedCommunitySettings = {
  id: demoData.community.id,
  name: demoData.community.name,
  city: demoData.community.city,
  contactEmail: demoData.community.contactEmail,
  openingHours: demoData.community.openingHours,
}

describe('useCommunitySettings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads settings for an approved community member', async () => {
    const onLoaded = vi.fn()
    vi.mocked(getCommunitySettings).mockResolvedValue({ community })

    const { result } = renderHook(() =>
      useCommunitySettings({
        communityId: demoData.community.id,
        enabled: true,
        onLoaded,
      }),
    )

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(onLoaded).toHaveBeenCalledWith(community)
    expect(getCommunitySettings).toHaveBeenCalledWith(
      demoData.community.id,
      expect.any(AbortSignal),
    )
  })

  it('exposes an error and retries the settings request', async () => {
    const onLoaded = vi.fn()
    const requestError = new Error('Offline')
    vi.mocked(getCommunitySettings)
      .mockRejectedValueOnce(requestError)
      .mockResolvedValueOnce({ community })

    const { result } = renderHook(() =>
      useCommunitySettings({
        communityId: demoData.community.id,
        enabled: true,
        onLoaded,
      }),
    )

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe(requestError)
    act(() => result.current.reload())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    expect(getCommunitySettings).toHaveBeenCalledTimes(2)
    expect(onLoaded).toHaveBeenCalledWith(community)
  })

  it('remains idle until community access is available', () => {
    const { result } = renderHook(() =>
      useCommunitySettings({
        communityId: demoData.community.id,
        enabled: false,
        onLoaded: vi.fn(),
      }),
    )

    act(() => result.current.reload())

    expect(result.current.status).toBe('idle')
    expect(getCommunitySettings).not.toHaveBeenCalled()
  })
})
