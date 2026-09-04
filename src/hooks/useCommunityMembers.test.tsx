import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listCommunityMembers } from '../api/managerMembers'
import { demoData } from '../data/demoData'
import { useCommunityMembers } from './useCommunityMembers'

vi.mock('../api/managerMembers', () => ({
  listCommunityMembers: vi.fn(),
}))

const managedMembers = [
  {
    displayName: 'Marina Valverde',
    favoriteGameIds: ['game-mtg'],
    id: 'member-player',
    joinedAt: '2026-09-01T10:00:00.000Z',
    role: 'player' as const,
    status: 'approved' as const,
    tagIds: ['tag-pauper'],
  },
]

const adaptedMembers = [
  {
    communityId: demoData.community.id,
    contactMethods: [],
    displayName: 'Marina Valverde',
    favoriteGameIds: ['game-mtg'],
    id: 'member-player',
    initials: 'MV',
    joinedAt: '2026-09-01T10:00:00.000Z',
    role: 'player' as const,
    status: 'approved' as const,
    tagIds: ['tag-pauper'],
  },
]

describe('useCommunityMembers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads and adapts the community members for an approved member', async () => {
    const onLoaded = vi.fn()
    vi.mocked(listCommunityMembers).mockResolvedValue({
      currentMemberId: 'member-player',
      members: managedMembers,
    })

    const { result } = renderHook(() =>
      useCommunityMembers({
        communityId: demoData.community.id,
        enabled: true,
        onLoaded,
      }),
    )

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(onLoaded).toHaveBeenCalledWith(adaptedMembers)
    expect(listCommunityMembers).toHaveBeenCalledWith(
      demoData.community.id,
      expect.any(AbortSignal),
    )
  })

  it('exposes an error and reloads the members on demand', async () => {
    const onLoaded = vi.fn()
    const requestError = new Error('Offline')
    vi.mocked(listCommunityMembers)
      .mockRejectedValueOnce(requestError)
      .mockResolvedValueOnce({
        currentMemberId: 'member-player',
        members: managedMembers,
      })

    const { result } = renderHook(() =>
      useCommunityMembers({
        communityId: demoData.community.id,
        enabled: true,
        onLoaded,
      }),
    )

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe(requestError)
    act(() => result.current.reload())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    expect(listCommunityMembers).toHaveBeenCalledTimes(2)
    expect(onLoaded).toHaveBeenCalledWith(adaptedMembers)
  })

  it('remains idle until community access is available', () => {
    const { result } = renderHook(() =>
      useCommunityMembers({
        communityId: demoData.community.id,
        enabled: false,
        onLoaded: vi.fn(),
      }),
    )

    act(() => result.current.reload())

    expect(result.current.status).toBe('idle')
    expect(listCommunityMembers).not.toHaveBeenCalled()
  })
})
