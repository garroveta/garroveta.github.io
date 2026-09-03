import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type AuthEnv } from './auth'
import {
  authorizeApprovedManager,
  authorizeApprovedMember,
} from './authorization'
import {
  handleReferentialApiRequest,
  matchReferentialRoute,
  type ReferentialRoute,
} from './community-referentials'

vi.mock('./authorization', () => ({
  authorizeApprovedManager: vi.fn(),
  authorizeApprovedMember: vi.fn(),
}))

const communityId = 'community-crc-delorean'
const rootRoute: ReferentialRoute = { action: 'root', communityId }
const gamesRoute: ReferentialRoute = {
  action: 'collection',
  communityId,
  kind: 'games',
}
const formatRoute: ReferentialRoute = {
  action: 'item',
  communityId,
  kind: 'formats',
  optionId: 'format-mtg-pauper',
}
const tagRoute: ReferentialRoute = {
  action: 'item',
  communityId,
  kind: 'tags',
  optionId: 'tag-pauper',
}

const memberAuthorization = {
  authorized: true as const,
  value: {
    membership: {
      communityId,
      displayName: 'Aina Mir',
      id: 'member-player',
      role: 'player' as const,
      status: 'approved' as const,
      userId: 'user-player',
    },
    user: {
      email: 'player@example.com',
      id: 'user-player',
      name: 'Aina Mir',
    },
  },
}

const managerAuthorization = {
  authorized: true as const,
  value: {
    membership: {
      communityId,
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

interface DatabaseOptions {
  allResults?: unknown[][]
  batchResults?: Array<{ results: unknown[] }>[]
  firstResults?: Array<unknown | Error>
}

function createDatabase({
  allResults = [],
  batchResults = [],
  firstResults = [],
}: DatabaseOptions = {}) {
  const pendingAllResults = [...allResults]
  const pendingBatchResults = [...batchResults]
  const pendingFirstResults = [...firstResults]
  const statements: Array<{
    all: ReturnType<typeof vi.fn>
    bind: ReturnType<typeof vi.fn>
    first: ReturnType<typeof vi.fn>
  }> = []
  const prepare = vi.fn((query: string) => {
    void query
    const statement = {
      all: vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ results: pendingAllResults.shift() ?? [] }),
        ),
      bind: vi.fn(),
      first: vi.fn().mockImplementation(() => {
        const result = pendingFirstResults.shift() ?? null
        return result instanceof Error
          ? Promise.reject(result)
          : Promise.resolve(result)
      }),
    }
    statement.bind.mockReturnValue(statement)
    statements.push(statement)
    return statement
  })
  const batch = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(pendingBatchResults.shift() ?? []),
    )

  return {
    batch,
    db: { batch, prepare } as unknown as D1Database,
    prepare,
    statements,
  }
}

function createContext(
  route: ReferentialRoute,
  {
    body,
    database = createDatabase(),
    method = 'GET',
  }: {
    body?: unknown
    database?: ReturnType<typeof createDatabase>
    method?: string
  } = {},
) {
  const suffix =
    route.action === 'root'
      ? ''
      : `/${route.kind}${route.action === 'order' ? '/order' : route.action === 'item' ? `/${route.optionId}` : ''}`
  const init: RequestInit = { method }

  if (body !== undefined) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }

  return {
    context: {
      context: {} as ExecutionContext,
      env: { DB: database.db } as AuthEnv,
      request: new Request(
        `https://api.garroveta.es/api/communities/${communityId}/referentials${suffix}`,
        init,
      ),
    },
    database,
  }
}

describe('Community referential routes', () => {
  it('matches root, collection, item and order routes', () => {
    expect(
      matchReferentialRoute(`/api/communities/${communityId}/referentials`),
    ).toEqual(rootRoute)
    expect(
      matchReferentialRoute(
        `/api/communities/${communityId}/referentials/games`,
      ),
    ).toEqual(gamesRoute)
    expect(
      matchReferentialRoute(
        `/api/communities/${communityId}/referentials/formats/format-mtg-pauper`,
      ),
    ).toEqual(formatRoute)
    expect(
      matchReferentialRoute(
        `/api/communities/${communityId}/referentials/tags/order`,
      ),
    ).toEqual({ action: 'order', communityId, kind: 'tags' })
  })

  it('rejects unknown categories and unsafe identifiers', () => {
    expect(
      matchReferentialRoute(
        `/api/communities/${communityId}/referentials/activities`,
      ),
    ).toBeNull()
    expect(
      matchReferentialRoute('/api/communities/community%2Fother/referentials'),
    ).toBeNull()
  })
})

describe('Community referential API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authorizeApprovedMember).mockResolvedValue(memberAuthorization)
    vi.mocked(authorizeApprovedManager).mockResolvedValue(managerAuthorization)
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
  })

  it('returns all categories to an approved member in persisted order', async () => {
    const database = createDatabase({
      batchResults: [
        [
          {
            results: [
              {
                category: 'card_game',
                color: '#b14f2f',
                community_id: communityId,
                id: 'game-mtg',
                is_active: 1,
                name: 'Magic: The Gathering',
                short_name: 'MTG',
                sort_order: 0,
              },
            ],
          },
          {
            results: [
              {
                color: '#8a6732',
                community_id: communityId,
                game_id: 'game-mtg',
                id: 'format-mtg-pauper',
                is_active: 1,
                name: 'Pauper',
                short_name: 'Pauper',
                sort_order: 0,
              },
            ],
          },
          { results: [] },
          { results: [] },
        ],
      ],
    })
    const { context } = createContext(rootRoute, { database })

    const response = await handleReferentialApiRequest(context, rootRoute)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      referentials: {
        formats: [
          {
            gameId: 'game-mtg',
            id: 'format-mtg-pauper',
            name: 'Pauper',
          },
        ],
        games: [
          {
            communityId,
            id: 'game-mtg',
            isActive: true,
            name: 'Magic: The Gathering',
          },
        ],
        series: [],
        tags: [],
      },
    })
    expect(database.batch).toHaveBeenCalledOnce()
    expect(authorizeApprovedMember).toHaveBeenCalledOnce()
  })

  it('checks manager access before parsing a mutation', async () => {
    vi.mocked(authorizeApprovedManager).mockResolvedValue({
      authorized: false,
      response: Response.json(
        { error: { code: 'manager_access_required' } },
        { status: 403 },
      ),
    })
    const { context, database } = createContext(gamesRoute, {
      body: { invalid: true },
      method: 'POST',
    })

    const response = await handleReferentialApiRequest(context, gamesRoute)

    expect(response.status).toBe(403)
    expect(database.prepare).not.toHaveBeenCalled()
  })

  it('creates a normalized game for an approved manager', async () => {
    const createdGame = {
      category: 'card_game',
      color: '#123abc',
      community_id: communityId,
      id: 'generated-id',
      is_active: 1,
      name: '  Pokémon  ',
      short_name: 'PKM',
      sort_order: 8,
    }
    const database = createDatabase({ firstResults: [7, createdGame] })
    const { context } = createContext(gamesRoute, {
      body: {
        category: 'card_game',
        color: '#123ABC',
        name: '  Pokémon  ',
        shortName: 'PKM',
      },
      database,
      method: 'POST',
    })

    const response = await handleReferentialApiRequest(context, gamesRoute)

    expect(response.status).toBe(201)
    expect(database.statements[1]?.bind).toHaveBeenCalledWith(
      expect.any(String),
      communityId,
      'Pokémon',
      'pokemon',
      'PKM',
      'card_game',
      '#123abc',
      8,
      expect.any(String),
      expect.any(String),
    )
  })

  it('returns a conflict when a normalized name already exists', async () => {
    const database = createDatabase({
      firstResults: [
        7,
        new Error('D1_ERROR: UNIQUE constraint failed: community_game.name'),
      ],
    })
    const { context } = createContext(gamesRoute, {
      body: {
        category: 'card_game',
        color: '#123abc',
        name: 'MAGÍC: THE GATHERING',
        shortName: 'MTG',
      },
      database,
      method: 'POST',
    })

    const response = await handleReferentialApiRequest(context, gamesRoute)

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'community_referential_duplicate' },
    })
  })

  it('requires an active community game when updating a format', async () => {
    const database = createDatabase({ firstResults: [null] })
    const { context } = createContext(formatRoute, {
      body: {
        color: '#8a6732',
        gameId: 'game-disabled',
        isActive: true,
        name: 'Pauper',
        shortName: 'Pauper',
      },
      database,
      method: 'PATCH',
    })

    const response = await handleReferentialApiRequest(context, formatRoute)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'community_referential_invalid' },
    })
  })

  it('updates and deactivates a tag without requiring a short name', async () => {
    const persistedTag = {
      color: '#315f73',
      community_id: communityId,
      id: 'tag-pauper',
      is_active: 0,
      kind: 'interest',
      name: 'Pauper local',
      sort_order: 2,
    }
    const database = createDatabase({ firstResults: [persistedTag] })
    const { context } = createContext(tagRoute, {
      body: {
        color: '#315f73',
        isActive: false,
        kind: 'interest',
        name: 'Pauper local',
      },
      database,
      method: 'PATCH',
    })

    const response = await handleReferentialApiRequest(context, tagRoute)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      option: { id: 'tag-pauper', isActive: false, name: 'Pauper local' },
    })
  })

  it('refuses to delete an option that is already in use', async () => {
    const database = createDatabase({ firstResults: [null, 'tag-pauper'] })
    const { context } = createContext(tagRoute, {
      database,
      method: 'DELETE',
    })

    const response = await handleReferentialApiRequest(context, tagRoute)

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'community_referential_in_use' },
    })
    expect(database.prepare).toHaveBeenCalledTimes(2)
    expect(database.prepare.mock.calls[0]?.[0]).toContain('not exists')
  })

  it('deletes an unused option in one guarded statement', async () => {
    const unusedTagRoute: ReferentialRoute = {
      ...tagRoute,
      optionId: 'tag-unused',
    }
    const database = createDatabase({ firstResults: ['tag-unused'] })
    const { context } = createContext(unusedTagRoute, {
      database,
      method: 'DELETE',
    })

    const response = await handleReferentialApiRequest(context, unusedTagRoute)

    expect(response.status).toBe(204)
    expect(database.prepare).toHaveBeenCalledOnce()
    expect(database.statements[0]?.bind).toHaveBeenCalledWith(
      communityId,
      'tag-unused',
      communityId,
      'tag-unused',
      communityId,
      'tag-unused',
      communityId,
      'tag-unused',
    )
  })

  it('reorders a complete category atomically', async () => {
    const route: ReferentialRoute = {
      action: 'order',
      communityId,
      kind: 'series',
    }
    const database = createDatabase({
      allResults: [[{ id: 'series-a' }, { id: 'series-b' }]],
      batchResults: [[{ results: [] }, { results: [] }]],
    })
    const { context } = createContext(route, {
      body: { optionIds: ['series-b', 'series-a'] },
      database,
      method: 'PATCH',
    })

    const response = await handleReferentialApiRequest(context, route)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      optionIds: ['series-b', 'series-a'],
    })
    expect(database.batch).toHaveBeenCalledOnce()
    expect(database.statements[1]?.bind).toHaveBeenCalledWith(
      0,
      expect.any(String),
      communityId,
      'series-b',
    )
  })
})
