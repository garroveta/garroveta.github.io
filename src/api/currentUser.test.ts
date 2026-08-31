import { afterEach, describe, expect, it, vi } from 'vitest'

import { getCurrentUser, updateCurrentMembership } from './currentUser'

describe('current user API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the authenticated account with its credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          memberships: [],
          user: {
            email: 'member@example.com',
            id: 'user-member',
            name: 'Member',
          },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getCurrentUser()).resolves.toMatchObject({
      memberships: [],
      user: { id: 'user-member' },
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/me'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('updates the profile and preferences of the current membership', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          membership: {
            communityId: 'community-crc-delorean',
            displayName: 'Marina Valverde',
            favoriteGameIds: ['game-mtg'],
            id: 'member-marina',
            tagIds: ['tag-pauper'],
          },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const input = {
      communityId: 'community-crc-delorean',
      displayName: 'Marina Valverde',
      favoriteGameIds: ['game-mtg'],
      tagIds: ['tag-pauper'],
    }

    await expect(updateCurrentMembership(input)).resolves.toMatchObject({
      membership: { displayName: 'Marina Valverde' },
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/me'),
      expect.objectContaining({
        body: JSON.stringify(input),
        credentials: 'include',
        method: 'PATCH',
      }),
    )
  })
})
