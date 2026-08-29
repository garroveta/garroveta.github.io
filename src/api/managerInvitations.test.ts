import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createCommunityInvitation,
  listCommunityInvitations,
} from './managerInvitations'

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

  it('creates an invitation and receives its one-time URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          invitation: {
            communityId: 'community-crc-delorean',
            createdAt: '2026-08-29T17:00:00.000Z',
            createdByMemberId: 'member-tomas',
            expiresAt: '2026-09-05T17:00:00.000Z',
            id: 'invitation-new',
            inviteUrl: 'https://www.garroveta.es/#registro?invite=secret-token',
            label: 'Grupo de septiembre',
            revokedAt: null,
            status: 'active',
            usedAt: null,
          },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 201,
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      createCommunityInvitation('community-crc-delorean', {
        expiresInDays: 7,
        label: 'Grupo de septiembre',
      }),
    ).resolves.toMatchObject({
      invitation: {
        id: 'invitation-new',
        inviteUrl: expect.stringContaining('#registro?invite='),
      },
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/communities/community-crc-delorean/invitations',
      ),
      expect.objectContaining({
        body: JSON.stringify({
          expiresInDays: 7,
          label: 'Grupo de septiembre',
        }),
        credentials: 'include',
        method: 'POST',
      }),
    )
  })
})
