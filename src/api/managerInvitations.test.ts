import { afterEach, describe, expect, it, vi } from 'vitest'

import { listCommunityInvitations } from './managerInvitations'

describe('manager invitation API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads invitations for the authenticated community manager', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          invitations: [
            {
              communityId: 'community-crc-delorean',
              createdAt: '2026-08-20T17:00:00.000Z',
              createdByMemberId: 'member-tomas',
              expiresAt: '2026-09-20T17:00:00.000Z',
              id: 'invitation-pilot',
              label: 'Grupo piloto',
              revokedAt: null,
              status: 'active',
              usedAt: null,
            },
          ],
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      listCommunityInvitations('community-crc-delorean'),
    ).resolves.toMatchObject({
      invitations: [{ id: 'invitation-pilot', status: 'active' }],
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/communities/community-crc-delorean/invitations',
      ),
      expect.objectContaining({ credentials: 'include' }),
    )
  })
})
