import { afterEach, describe, expect, it, vi } from 'vitest'

import { getCurrentUser } from './currentUser'

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
})
