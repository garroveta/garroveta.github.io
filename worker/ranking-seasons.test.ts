import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  authorizeApprovedManager,
  authorizeApprovedMember,
  type ManagerAuthorizationResult,
  type MemberAuthorizationResult,
} from './authorization'
import { type AuthEnv } from './auth'
import { getDefaultBadgeSettings } from '../src/domain/badges'
import {
  handleRankingSeasonApiRequest,
  matchRankingSeasonRoute,
} from './ranking-seasons'

vi.mock('./authorization', () => ({
  authorizeApprovedManager: vi.fn(),
  authorizeApprovedMember: vi.fn(),
}))

const collectionRoute = {
  communityId: 'community-crc-delorean',
  kind: 'collection' as const,
}
const seasonRoute = {
  communityId: 'community-crc-delorean',
  kind: 'season' as const,
  seasonId: 'season-2027',
}
const activateRoute = {
  communityId: 'community-crc-delorean',
  kind: 'activate' as const,
  seasonId: 'season-2027',
}
const closeRoute = {
  communityId: 'community-crc-delorean',
  kind: 'close' as const,
  seasonId: 'season-2026',
}

const persistedSeason = {
  community_id: 'community-crc-delorean',
  eligible_member_ids: null,
  ends_on: '2027-12-31',
  id: 'season-2027',
  name: 'Temporada 2027',
  points_fifth: 4,
  points_first: 10,
  points_fourth: 5,
  points_participation: 1,
  points_second: 8,
  points_sixth_to_tenth: 3,
  points_third: 6,
  starts_on: '2027-01-01',
  status: 'upcoming',
}

const seasonInput = {
  endsOn: '2027-12-31',
  name: 'Temporada 2027',
  points: {
    fifth: 4,
    first: 10,
    fourth: 5,
    participation: 1,
    second: 8,
    sixthToTenth: 3,
    third: 6,
  },
  startsOn: '2027-01-01',
}

function memberAuthorization(): MemberAuthorizationResult {
  return {
    authorized: true,
    value: {
      membership: {
        communityId: 'community-crc-delorean',
        displayName: 'Aina Mir',
        id: 'member-player',
        role: 'player',
        status: 'approved',
        userId: 'user-player',
      },
      user: { email: 'player@example.com', id: 'user-player', name: 'Aina' },
    },
  }
}

function managerAuthorization(): ManagerAuthorizationResult {
  return {
    authorized: true,
    value: {
      membership: {
        communityId: 'community-crc-delorean',
        displayName: 'Tomás',
        id: 'member-manager',
        role: 'manager',
        status: 'approved',
        userId: 'user-manager',
      },
      user: { email: 'manager@example.com', id: 'user-manager', name: 'Tomás' },
    },
  }
}

function createContext({
  allResults,
  body,
  firstResults = [],
  method = 'GET',
}: {
  allResults?: unknown[][]
  body?: unknown
  firstResults?: unknown[]
  method?: string
} = {}) {
  const statements: Array<{
    all: ReturnType<typeof vi.fn>
    bind: ReturnType<typeof vi.fn>
    first: ReturnType<typeof vi.fn>
  }> = []
  const pendingFirstResults = [...firstResults]
  const pendingAllResults = allResults ? [...allResults] : [[]]
  const prepare = vi.fn(() => {
    const statement = {
      all: vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve({ results: pendingAllResults.shift() ?? [] }),
        ),
      bind: vi.fn(),
      first: vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(pendingFirstResults.shift() ?? null),
        ),
    }
    statement.bind.mockReturnValue(statement)
    statements.push(statement)
    return statement
  })
  const init: RequestInit = { method }

  if (body !== undefined) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }

  return {
    context: {
      context: {} as ExecutionContext,
      env: { DB: { prepare } as unknown as D1Database } as AuthEnv,
      request: new Request(
        'https://api.garroveta.es/api/communities/community-crc-delorean/ranking-seasons',
        init,
      ),
    },
    prepare,
    statements,
  }
}

describe('Ranking season routes', () => {
  it('matches collection, season and action routes with safe identifiers', () => {
    expect(
      matchRankingSeasonRoute(
        '/api/communities/community-crc-delorean/ranking-seasons',
      ),
    ).toEqual(collectionRoute)
    expect(
      matchRankingSeasonRoute(
        '/api/communities/community-crc-delorean/ranking-seasons/season-2027',
      ),
    ).toEqual(seasonRoute)
    expect(
      matchRankingSeasonRoute(
        '/api/communities/community-crc-delorean/ranking-seasons/season-2027/activate',
      ),
    ).toEqual(activateRoute)
    expect(
      matchRankingSeasonRoute(
        '/api/communities/community-crc-delorean/ranking-seasons/season-2026/close',
      ),
    ).toEqual(closeRoute)
    expect(
      matchRankingSeasonRoute(
        '/api/communities/community%2Fother/ranking-seasons',
      ),
    ).toBeNull()
  })
})

describe('Ranking season API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authorizeApprovedMember).mockResolvedValue(memberAuthorization())
    vi.mocked(authorizeApprovedManager).mockResolvedValue(
      managerAuthorization(),
    )
  })

  it('requires authentication to list seasons', async () => {
    vi.mocked(authorizeApprovedMember).mockResolvedValue({
      authorized: false,
      response: new Response(null, { status: 401 }),
    })
    const { context } = createContext()

    const response = await handleRankingSeasonApiRequest(
      context,
      collectionRoute,
    )

    expect(response.status).toBe(401)
  })

  it('lists ranking seasons for an approved member', async () => {
    const { context, statements } = createContext({
      allResults: [[persistedSeason]],
    })

    const response = await handleRankingSeasonApiRequest(
      context,
      collectionRoute,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      seasons: [
        {
          communityId: 'community-crc-delorean',
          endsOn: '2027-12-31',
          id: 'season-2027',
          name: 'Temporada 2027',
          points: seasonInput.points,
          startsOn: '2027-01-01',
          status: 'upcoming',
        },
      ],
    })
    expect(statements[0]?.bind).toHaveBeenCalledWith('community-crc-delorean')
  })

  it('rejects a non-manager creating a season', async () => {
    vi.mocked(authorizeApprovedManager).mockResolvedValue({
      authorized: false,
      response: new Response(null, { status: 403 }),
    })
    const { context } = createContext({ body: seasonInput, method: 'POST' })

    const response = await handleRankingSeasonApiRequest(
      context,
      collectionRoute,
    )

    expect(response.status).toBe(403)
  })

  it('creates a season when its dates do not overlap', async () => {
    const { context, statements } = createContext({
      body: seasonInput,
      firstResults: [null, persistedSeason],
      method: 'POST',
    })

    const response = await handleRankingSeasonApiRequest(
      context,
      collectionRoute,
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toMatchObject({
      season: { id: 'season-2027', status: 'upcoming' },
    })
    expect(statements[0]?.bind).toHaveBeenCalledWith(
      'community-crc-delorean',
      '',
      '2027-12-31',
      '2027-01-01',
    )
  })

  it('rejects a season whose dates overlap an existing one', async () => {
    const { context } = createContext({
      body: seasonInput,
      firstResults: [{ id: 'season-2026' }],
      method: 'POST',
    })

    const response = await handleRankingSeasonApiRequest(
      context,
      collectionRoute,
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'ranking_season_overlap' },
    })
  })

  it('rejects points that increase from first place to participation', async () => {
    const { context } = createContext({
      body: { ...seasonInput, points: { ...seasonInput.points, fifth: 20 } },
      method: 'POST',
    })

    const response = await handleRankingSeasonApiRequest(
      context,
      collectionRoute,
    )

    expect(response.status).toBe(400)
  })

  it('activates an upcoming season when none is active', async () => {
    const { context, statements } = createContext({
      firstResults: [
        { status: 'upcoming' },
        null,
        { ...persistedSeason, status: 'active' },
      ],
      method: 'POST',
    })

    const response = await handleRankingSeasonApiRequest(context, activateRoute)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      season: { status: 'active' },
    })
    expect(statements[2]?.bind).toHaveBeenCalledWith(
      expect.any(String),
      'season-2027',
      'community-crc-delorean',
    )
  })

  it('refuses to activate a season while another one is active', async () => {
    const { context } = createContext({
      firstResults: [{ status: 'upcoming' }, { id: 'season-2026' }],
      method: 'POST',
    })

    const response = await handleRankingSeasonApiRequest(context, activateRoute)

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'ranking_season_already_active' },
    })
  })

  it('refuses to activate a season that is not upcoming', async () => {
    const { context } = createContext({
      firstResults: [{ status: 'closed' }],
      method: 'POST',
    })

    const response = await handleRankingSeasonApiRequest(context, activateRoute)

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'ranking_season_not_upcoming' },
    })
  })

  it('closes the active season, freezing members and badges', async () => {
    const frozenBadges = getDefaultBadgeSettings().badges
    const { context, statements } = createContext({
      allResults: [[{ id: 'member-alex' }, { id: 'member-marta' }]],
      firstResults: [
        { badge_settings: '[]' },
        {
          ...persistedSeason,
          badges: JSON.stringify(frozenBadges),
          eligible_member_ids: JSON.stringify(['member-alex', 'member-marta']),
          id: 'season-2026',
          status: 'closed',
        },
      ],
      method: 'POST',
    })

    const response = await handleRankingSeasonApiRequest(context, closeRoute)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      season: {
        badges: frozenBadges,
        eligibleMemberIds: ['member-alex', 'member-marta'],
        status: 'closed',
      },
    })
    expect(statements[2]?.bind).toHaveBeenCalledWith(
      JSON.stringify(['member-alex', 'member-marta']),
      JSON.stringify(frozenBadges),
      expect.any(String),
      'season-2026',
      'community-crc-delorean',
    )
  })

  it('never overwrites badges a season already froze', async () => {
    const { context, prepare } = createContext({
      allResults: [[]],
      firstResults: [{ badge_settings: '[]' }, null],
      method: 'POST',
    })

    await handleRankingSeasonApiRequest(context, closeRoute)

    const closingSql = (prepare.mock.calls as unknown[][])
      .map(([sql]) => String(sql))
      .find((sql) => sql.includes("status = 'closed'"))

    expect(closingSql).toContain('badges = coalesce(badges, ?)')
  })

  it('refuses to close a season that is not active', async () => {
    const { context } = createContext({
      allResults: [[]],
      firstResults: [null],
      method: 'POST',
    })

    const response = await handleRankingSeasonApiRequest(context, closeRoute)

    expect(response.status).toBe(409)
  })

  it('deletes only an upcoming season', async () => {
    const { context, statements } = createContext({
      firstResults: [{ id: 'season-2027' }],
      method: 'DELETE',
    })

    const response = await handleRankingSeasonApiRequest(context, seasonRoute)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      deletedSeasonId: 'season-2027',
    })
    expect(statements[0]?.bind).toHaveBeenCalledWith(
      'season-2027',
      'community-crc-delorean',
    )
  })

  it('refuses to delete an active or closed season', async () => {
    const { context } = createContext({
      firstResults: [null],
      method: 'DELETE',
    })

    const response = await handleRankingSeasonApiRequest(context, seasonRoute)

    expect(response.status).toBe(409)
  })

  it('updates the points of an editable season, keeping its dates', async () => {
    const { context, statements } = createContext({
      body: { points: seasonInput.points },
      firstResults: [persistedSeason, persistedSeason],
      method: 'PATCH',
    })

    const response = await handleRankingSeasonApiRequest(context, seasonRoute)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      season: { points: seasonInput.points },
    })
    // No overlap lookup when the dates did not move: read, then write.
    expect(statements).toHaveLength(2)
    expect(statements[1]?.bind).toHaveBeenCalledWith(
      '2027-01-01',
      '2027-12-31',
      10,
      8,
      6,
      5,
      4,
      3,
      1,
      expect.any(String),
      'season-2027',
      'community-crc-delorean',
    )
  })

  it('moves the end of a season when nothing else claims the new dates', async () => {
    const { context, statements } = createContext({
      body: { endsOn: '2028-03-31' },
      firstResults: [
        { ...persistedSeason, status: 'active' },
        null,
        { ...persistedSeason, ends_on: '2028-03-31', status: 'active' },
      ],
      method: 'PATCH',
    })

    const response = await handleRankingSeasonApiRequest(context, seasonRoute)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      season: { endsOn: '2028-03-31', startsOn: '2027-01-01' },
    })
    // The overlap lookup must ignore the season being edited.
    expect(statements[1]?.bind).toHaveBeenCalledWith(
      'community-crc-delorean',
      'season-2027',
      '2028-03-31',
      '2027-01-01',
    )
    // Points untouched: the write carries the stored ones.
    expect(statements[2]?.bind).toHaveBeenCalledWith(
      '2027-01-01',
      '2028-03-31',
      10,
      8,
      6,
      5,
      4,
      3,
      1,
      expect.any(String),
      'season-2027',
      'community-crc-delorean',
    )
  })

  it('refuses dates that would overlap another season', async () => {
    const { context, statements } = createContext({
      body: { startsOn: '2026-11-01' },
      firstResults: [persistedSeason, { id: 'season-2026' }],
      method: 'PATCH',
    })

    const response = await handleRankingSeasonApiRequest(context, seasonRoute)

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'ranking_season_overlap' },
    })
    expect(statements).toHaveLength(2)
  })

  it('refuses a start after the end, merged with the stored dates', async () => {
    const { context, statements } = createContext({
      body: { startsOn: '2028-01-01' },
      firstResults: [persistedSeason],
      method: 'PATCH',
    })

    const response = await handleRankingSeasonApiRequest(context, seasonRoute)

    expect(response.status).toBe(400)
    expect(statements).toHaveLength(1)
  })

  it('refuses an empty update or a malformed date', async () => {
    for (const body of [{}, { endsOn: '31/12/2027' }]) {
      const { context } = createContext({
        body,
        firstResults: [persistedSeason],
        method: 'PATCH',
      })

      const response = await handleRankingSeasonApiRequest(context, seasonRoute)

      expect(response.status).toBe(400)
    }
  })

  it('refuses to edit a closed season at all', async () => {
    const { context, statements } = createContext({
      body: { endsOn: '2028-03-31', points: seasonInput.points },
      firstResults: [
        { ...persistedSeason, eligible_member_ids: '[]', status: 'closed' },
      ],
      method: 'PATCH',
    })

    const response = await handleRankingSeasonApiRequest(context, seasonRoute)

    expect(response.status).toBe(409)
    expect(statements).toHaveLength(1)
  })

  it('reports a season that does not exist', async () => {
    const { context } = createContext({
      body: { points: seasonInput.points },
      firstResults: [null],
      method: 'PATCH',
    })

    const response = await handleRankingSeasonApiRequest(context, seasonRoute)

    expect(response.status).toBe(404)
  })
})
