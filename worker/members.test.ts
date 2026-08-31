import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authorizeApprovedManager } from './authorization'
import { type AuthEnv } from './auth'
import { handleMemberApiRequest, matchMemberRoute } from './members'

vi.mock('./authorization', () => ({
  authorizeApprovedManager: vi.fn(),
}))

const route = { communityId: 'community-crc-delorean' }

const managerAuthorization = {
  authorized: true as const,
  value: {
    membership: {
      communityId: 'community-crc-delorean',
      displayName: 'Tomás',
      id: 'member-manager',
      role: 'manager' as const,
      status: 'approved' as const,
      userId: 'user-manager',
    },
    user: {
      email: 'manager@example.com',
      id: 'user-manager',
      name: 'Tomás',
    },
  },
}

function createContext({
  method = 'GET',
  rows = [],
}: { method?: string; rows?: unknown[] } = {}) {
  const all = vi.fn().mockResolvedValue({ results: rows })
  const bind = vi.fn().mockReturnValue({ all })
  const prepare = vi.fn().mockReturnValue({ bind })

  return {
    all,
    bind,
    context: {
      context: {} as ExecutionContext,
      env: { DB: { prepare } as unknown as D1Database } as AuthEnv,
      request: new Request(
        'https://api.garroveta.es/api/communities/community-crc-delorean/members',
        { method },
      ),
    },
    prepare,
  }
}

describe('Member manager routes', () => {
  it('matches only safe community member collection routes', () => {
    expect(
      matchMemberRoute('/api/communities/community-crc-delorean/members'),
    ).toEqual(route)
    expect(
      matchMemberRoute('/api/communities/community-crc-delorean/members/'),
    ).toEqual(route)
    expect(
      matchMemberRoute('/api/communities/community%2Fother/members'),
    ).toBeNull()
    expect(
      matchMemberRoute('/api/communities/community/members/extra'),
    ).toBeNull()
  })
})

describe('Member manager API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authorizeApprovedManager).mockResolvedValue(managerAuthorization)
  })

  it('lists community members without exposing authentication secrets', async () => {
    const { bind, context } = createContext({
      rows: [
        {
          display_name: 'Marina Valverde',
          email: 'marina@example.com',
          favorite_game_ids: '["game-mtg"]',
          id: 'member-player',
          joined_at: '2026-09-01T10:00:00.000Z',
          role: 'player',
          status: 'approved',
          tag_ids: '["tag-pauper"]',
        },
      ],
    })

    const response = await handleMemberApiRequest(context, route)

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
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
    })
    expect(bind).toHaveBeenCalledWith('community-crc-delorean')
  })

  it.each([
    [401, 'authentication_required'],
    [403, 'manager_access_required'],
  ])(
    'returns a %i authorization failure before querying the member list',
    async (status, code) => {
      vi.mocked(authorizeApprovedManager).mockResolvedValue({
        authorized: false,
        response: Response.json({ error: { code } }, { status }),
      })
      const { context, prepare } = createContext()

      const response = await handleMemberApiRequest(context, route)

      expect(response.status).toBe(status)
      expect(prepare).not.toHaveBeenCalled()
    },
  )

  it('rejects unsupported methods before authorization', async () => {
    const { context, prepare } = createContext({ method: 'PATCH' })

    const response = await handleMemberApiRequest(context, route)

    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('GET')
    expect(authorizeApprovedManager).not.toHaveBeenCalled()
    expect(prepare).not.toHaveBeenCalled()
  })
})
