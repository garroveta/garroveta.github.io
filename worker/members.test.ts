import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authorizeApprovedManager } from './authorization'
import { type AuthEnv } from './auth'
import { handleMemberApiRequest, matchMemberRoute } from './members'

vi.mock('./authorization', () => ({
  authorizeApprovedManager: vi.fn(),
}))

const collectionRoute = {
  communityId: 'community-crc-delorean',
  kind: 'collection' as const,
}
const memberRoute = {
  communityId: 'community-crc-delorean',
  kind: 'member' as const,
  memberId: 'member-player',
}

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

const approvedPlayer = {
  display_name: 'Marina Valverde',
  email: 'marina@example.com',
  favorite_game_ids: '["game-mtg"]',
  id: 'member-player',
  joined_at: '2026-09-01T10:00:00.000Z',
  role: 'player',
  status: 'approved',
  tag_ids: '["tag-pauper"]',
}

function createContext({
  body,
  firstResults = [],
  method = 'GET',
  rows = [],
}: {
  body?: unknown
  firstResults?: unknown[]
  method?: string
  rows?: unknown[]
} = {}) {
  const statements: Array<{
    all: ReturnType<typeof vi.fn>
    bind: ReturnType<typeof vi.fn>
    first: ReturnType<typeof vi.fn>
  }> = []
  const pendingFirstResults = [...firstResults]
  const prepare = vi.fn(() => {
    const statement = {
      all: vi.fn().mockResolvedValue({ results: rows }),
      bind: vi.fn(),
      first: vi.fn().mockResolvedValue(pendingFirstResults.shift() ?? null),
    }
    statement.bind.mockReturnValue(statement)
    statements.push(statement)
    return statement
  })
  const requestInit: RequestInit = { method }

  if (body !== undefined) {
    requestInit.body = JSON.stringify(body)
    requestInit.headers = { 'Content-Type': 'application/json' }
  }

  return {
    context: {
      context: {} as ExecutionContext,
      env: { DB: { prepare } as unknown as D1Database } as AuthEnv,
      request: new Request(
        'https://api.garroveta.es/api/communities/community-crc-delorean/members',
        requestInit,
      ),
    },
    prepare,
    statements,
  }
}

describe('Member manager routes', () => {
  it('matches only safe member routes', () => {
    expect(
      matchMemberRoute('/api/communities/community-crc-delorean/members'),
    ).toEqual(collectionRoute)
    expect(
      matchMemberRoute('/api/communities/community-crc-delorean/members/'),
    ).toEqual(collectionRoute)
    expect(
      matchMemberRoute(
        '/api/communities/community-crc-delorean/members/member-player',
      ),
    ).toEqual(memberRoute)
    expect(
      matchMemberRoute('/api/communities/community%2Fother/members'),
    ).toBeNull()
    expect(
      matchMemberRoute('/api/communities/community/members/member%2Fother'),
    ).toBeNull()
  })
})

describe('Member manager API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authorizeApprovedManager).mockResolvedValue(managerAuthorization)
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
  })

  it('lists community members without exposing authentication secrets', async () => {
    const { context, statements } = createContext({ rows: [approvedPlayer] })

    const response = await handleMemberApiRequest(context, collectionRoute)

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
    expect(statements[0]?.bind).toHaveBeenCalledWith('community-crc-delorean')
  })

  it('updates a member role, status and tags', async () => {
    const updatedPlayer = {
      ...approvedPlayer,
      role: 'moderator',
      tag_ids: '["tag-modern","tag-draft"]',
    }
    const { context, statements } = createContext({
      body: {
        role: 'moderator',
        status: 'approved',
        tagIds: ['tag-modern', 'tag-draft', 'tag-modern'],
      },
      firstResults: [approvedPlayer, updatedPlayer],
      method: 'PATCH',
    })

    const response = await handleMemberApiRequest(context, memberRoute)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      member: {
        id: 'member-player',
        role: 'moderator',
        status: 'approved',
        tagIds: ['tag-modern', 'tag-draft'],
      },
    })
    expect(statements[0]?.bind).toHaveBeenCalledWith(
      'community-crc-delorean',
      'member-player',
    )
    expect(statements[1]?.bind).toHaveBeenCalledWith(
      'moderator',
      'approved',
      '["tag-modern","tag-draft"]',
      expect.any(String),
      'community-crc-delorean',
      'member-player',
      'moderator',
      'approved',
      'community-crc-delorean',
    )
  })

  it('protects the current manager from losing access', async () => {
    const currentManager = {
      ...approvedPlayer,
      id: 'member-manager',
      role: 'manager',
    }
    const { context, prepare } = createContext({
      body: { status: 'suspended' },
      firstResults: [currentManager],
      method: 'PATCH',
    })

    const response = await handleMemberApiRequest(context, {
      ...memberRoute,
      memberId: 'member-manager',
    })

    expect(response.status).toBe(409)
    expect(prepare).toHaveBeenCalledTimes(1)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'current_manager_protected' },
    })
  })

  it('protects the last approved manager atomically', async () => {
    const anotherManager = {
      ...approvedPlayer,
      id: 'member-another-manager',
      role: 'manager',
    }
    const { context } = createContext({
      body: { role: 'player' },
      firstResults: [anotherManager, null],
      method: 'PATCH',
    })

    const response = await handleMemberApiRequest(context, {
      ...memberRoute,
      memberId: 'member-another-manager',
    })

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'last_manager_protected' },
    })
  })

  it('rejects invalid member changes before reading the target member', async () => {
    const { context, prepare } = createContext({
      body: { status: 'pending' },
      method: 'PATCH',
    })

    const response = await handleMemberApiRequest(context, memberRoute)

    expect(response.status).toBe(400)
    expect(prepare).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'member_invalid' },
    })
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

      const response = await handleMemberApiRequest(context, collectionRoute)

      expect(response.status).toBe(status)
      expect(prepare).not.toHaveBeenCalled()
    },
  )

  it('rejects unsupported methods before authorization', async () => {
    const { context, prepare } = createContext({ method: 'PATCH' })

    const response = await handleMemberApiRequest(context, collectionRoute)

    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('GET')
    expect(authorizeApprovedManager).not.toHaveBeenCalled()
    expect(prepare).not.toHaveBeenCalled()
  })
})
