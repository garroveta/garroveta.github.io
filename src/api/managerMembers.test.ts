import { afterEach, describe, expect, it, vi } from 'vitest'

import { listCommunityMembers } from './managerMembers'

describe('manager member API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads members for the authenticated community manager', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        currentMemberId: 'member-manager',
        members: [
          {
            displayName: 'Marina Valverde',
            email: 'marina@example.com',
            favoriteGameIds: ['game-mtg'],
            id: 'member-player',
            joinedAt: '2026-09-01T10:00:00.000Z',
            role: 'player',
            status: 'approved',
            tagIds: ['tag-pauper'],
          },
        ],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      listCommunityMembers('community-crc-delorean'),
    ).resolves.toMatchObject({
      currentMemberId: 'member-manager',
      members: [{ id: 'member-player', role: 'player' }],
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/communities/community-crc-delorean/members',
      ),
      expect.objectContaining({ credentials: 'include' }),
    )
  })
})
