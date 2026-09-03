import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listCommunityReferentials } from '../api/communityReferentials'
import { demoData } from '../data/demoData'
import { useCommunityReferentials } from './useCommunityReferentials'

vi.mock('../api/communityReferentials', () => ({
  listCommunityReferentials: vi.fn(),
}))

const referentials = {
  competitionEventKinds: demoData.competitionEventKinds,
  competitionFormats: demoData.competitionFormats,
  games: demoData.games,
  tags: demoData.tags,
}

describe('useCommunityReferentials', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads referentials for an approved community member', async () => {
    const onLoaded = vi.fn()
    vi.mocked(listCommunityReferentials).mockResolvedValue({ referentials })

    const { result } = renderHook(() =>
      useCommunityReferentials({
        communityId: demoData.community.id,
        enabled: true,
        onLoaded,
      }),
    )

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(onLoaded).toHaveBeenCalledWith(referentials)
    expect(listCommunityReferentials).toHaveBeenCalledWith(
      demoData.community.id,
      expect.any(AbortSignal),
    )
  })

  it('exposes an error and retries the request', async () => {
    const onLoaded = vi.fn()
    const requestError = new Error('Offline')
    vi.mocked(listCommunityReferentials)
      .mockRejectedValueOnce(requestError)
      .mockResolvedValueOnce({ referentials })

    const { result } = renderHook(() =>
      useCommunityReferentials({
        communityId: demoData.community.id,
        enabled: true,
        onLoaded,
      }),
    )

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe(requestError)
    act(() => result.current.reload())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(listCommunityReferentials).toHaveBeenCalledTimes(2)
  })

  it('remains idle until community access is available', () => {
    const { result } = renderHook(() =>
      useCommunityReferentials({
        communityId: demoData.community.id,
        enabled: false,
        onLoaded: vi.fn(),
      }),
    )

    act(() => result.current.reload())

    expect(result.current.status).toBe('idle')
    expect(listCommunityReferentials).not.toHaveBeenCalled()
  })
})
