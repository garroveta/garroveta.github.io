import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  listCommunityCommunications,
  type CommunityCommunication,
} from '../api/communityCommunications'
import { useCommunityCommunications } from './useCommunityCommunications'

vi.mock('../api/communityCommunications', () => ({
  listCommunityCommunications: vi.fn(),
}))

const communication: CommunityCommunication = {
  authorDisplayName: 'Tomás',
  authorMemberId: 'member-manager',
  communityId: 'community-crc-delorean',
  content: 'Abrimos a las 17:00 de miércoles a viernes.',
  excerpt: 'El bar abre más tarde durante el verano.',
  id: 'communication-summer-hours',
  pinned: true,
  publishedAt: '2026-08-01T10:00:00.000Z',
  tagIds: [],
  title: 'Horario de verano',
  type: 'urgent',
}

describe('useCommunityCommunications', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads communications for an approved community member', async () => {
    const onLoaded = vi.fn()
    vi.mocked(listCommunityCommunications).mockResolvedValue({
      communications: [communication],
    })

    const { result } = renderHook(() =>
      useCommunityCommunications({
        communityId: 'community-crc-delorean',
        enabled: true,
        onLoaded,
      }),
    )

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(onLoaded).toHaveBeenCalledWith([communication])
    expect(listCommunityCommunications).toHaveBeenCalledWith(
      'community-crc-delorean',
      expect.any(AbortSignal),
    )
  })

  it('exposes an error and reloads the feed on demand', async () => {
    const onLoaded = vi.fn()
    const requestError = new Error('Offline')
    vi.mocked(listCommunityCommunications)
      .mockRejectedValueOnce(requestError)
      .mockResolvedValueOnce({ communications: [communication] })

    const { result } = renderHook(() =>
      useCommunityCommunications({
        communityId: 'community-crc-delorean',
        enabled: true,
        onLoaded,
      }),
    )

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe(requestError)
    act(() => result.current.reload())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    expect(listCommunityCommunications).toHaveBeenCalledTimes(2)
    expect(onLoaded).toHaveBeenCalledWith([communication])
  })

  it('remains idle while community access is unavailable', () => {
    const { result } = renderHook(() =>
      useCommunityCommunications({
        communityId: 'community-crc-delorean',
        enabled: false,
        onLoaded: vi.fn(),
      }),
    )

    act(() => result.current.reload())

    expect(result.current.status).toBe('idle')
    expect(listCommunityCommunications).not.toHaveBeenCalled()
  })
})
