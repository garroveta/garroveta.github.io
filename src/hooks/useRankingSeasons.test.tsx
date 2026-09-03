import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listCommunityRankingSeasons } from '../api/rankingSeasons'
import { demoData } from '../data/demoData'
import { useRankingSeasons } from './useRankingSeasons'

vi.mock('../api/rankingSeasons', () => ({
  listCommunityRankingSeasons: vi.fn(),
}))

const seasons = demoData.rankingSeasons

describe('useRankingSeasons', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads ranking seasons for an approved community member', async () => {
    const onLoaded = vi.fn()
    vi.mocked(listCommunityRankingSeasons).mockResolvedValue({ seasons })

    const { result } = renderHook(() =>
      useRankingSeasons({
        communityId: demoData.community.id,
        enabled: true,
        onLoaded,
      }),
    )

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(onLoaded).toHaveBeenCalledWith(seasons)
    expect(listCommunityRankingSeasons).toHaveBeenCalledWith(
      demoData.community.id,
      expect.any(AbortSignal),
    )
  })

  it('exposes an error and reloads the seasons on demand', async () => {
    const onLoaded = vi.fn()
    const requestError = new Error('Offline')
    vi.mocked(listCommunityRankingSeasons)
      .mockRejectedValueOnce(requestError)
      .mockResolvedValueOnce({ seasons })

    const { result } = renderHook(() =>
      useRankingSeasons({
        communityId: demoData.community.id,
        enabled: true,
        onLoaded,
      }),
    )

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe(requestError)
    act(() => result.current.reload())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    expect(listCommunityRankingSeasons).toHaveBeenCalledTimes(2)
    expect(onLoaded).toHaveBeenCalledWith(seasons)
  })

  it('remains idle until community access is available', () => {
    const { result } = renderHook(() =>
      useRankingSeasons({
        communityId: demoData.community.id,
        enabled: false,
        onLoaded: vi.fn(),
      }),
    )

    act(() => result.current.reload())

    expect(result.current.status).toBe('idle')
    expect(listCommunityRankingSeasons).not.toHaveBeenCalled()
  })
})
