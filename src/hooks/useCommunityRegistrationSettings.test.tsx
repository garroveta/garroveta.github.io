import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getCommunityRegistrationSettings } from '../api/communityRegistrationSettings'
import { demoData } from '../data/demoData'
import { useCommunityRegistrationSettings } from './useCommunityRegistrationSettings'

vi.mock('../api/communityRegistrationSettings', () => ({
  getCommunityRegistrationSettings: vi.fn(),
}))

describe('useCommunityRegistrationSettings', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads settings for an approved community member', async () => {
    const onLoaded = vi.fn()
    vi.mocked(getCommunityRegistrationSettings).mockResolvedValue({
      registrationSettings: demoData.registrationSettings,
    })

    const { result } = renderHook(() =>
      useCommunityRegistrationSettings({
        communityId: demoData.community.id,
        enabled: true,
        onLoaded,
      }),
    )

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(onLoaded).toHaveBeenCalledWith(demoData.registrationSettings)
    expect(getCommunityRegistrationSettings).toHaveBeenCalledWith(
      demoData.community.id,
      expect.any(AbortSignal),
    )
  })

  it('exposes an error and retries the request', async () => {
    const onLoaded = vi.fn()
    const requestError = new Error('Offline')
    vi.mocked(getCommunityRegistrationSettings)
      .mockRejectedValueOnce(requestError)
      .mockResolvedValueOnce({
        registrationSettings: demoData.registrationSettings,
      })

    const { result } = renderHook(() =>
      useCommunityRegistrationSettings({
        communityId: demoData.community.id,
        enabled: true,
        onLoaded,
      }),
    )

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe(requestError)
    act(() => result.current.reload())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(getCommunityRegistrationSettings).toHaveBeenCalledTimes(2)
  })

  it('remains idle until community access is available', () => {
    const { result } = renderHook(() =>
      useCommunityRegistrationSettings({
        communityId: demoData.community.id,
        enabled: false,
        onLoaded: vi.fn(),
      }),
    )

    act(() => result.current.reload())

    expect(result.current.status).toBe('idle')
    expect(getCommunityRegistrationSettings).not.toHaveBeenCalled()
  })
})
