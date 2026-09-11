import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  authorizeApprovedManager,
  authorizeApprovedMember,
  type ManagerAuthorizationResult,
  type MemberAuthorizationResult,
} from './authorization'
import { type AuthEnv } from './auth'
import {
  handleBadgeSettingsApiRequest,
  matchBadgeSettingsRoute,
  parseStoredBadgeSettings,
} from './badge-settings'
import { getDefaultBadgeSettings } from '../src/domain/badges'

vi.mock('./authorization', () => ({
  authorizeApprovedManager: vi.fn(),
  authorizeApprovedMember: vi.fn(),
}))

const route = { communityId: 'community-crc-delorean' }

function memberAuthorization(): MemberAuthorizationResult {
  return {
    authorized: true,
    value: {
      membership: {
        communityId: route.communityId,
        displayName: 'Aina Mir',
        id: 'member-player',
        role: 'player',
        status: 'approved',
        userId: 'user-player',
      },
      user: {
        email: 'player@example.com',
        id: 'user-player',
        name: 'Aina Mir',
      },
    },
  }
}

function managerAuthorization(): ManagerAuthorizationResult {
  return {
    authorized: true,
    value: {
      membership: {
        communityId: route.communityId,
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
  body,
  method = 'GET',
  row,
  batchResults = [{ results: [{ badge_settings: '[]' }] }, { results: [] }],
}: {
  body?: unknown
  method?: string
  row?: unknown
  batchResults?: unknown[]
} = {}) {
  const first = vi.fn().mockResolvedValue(row ?? null)
  const bind = vi.fn()
  const prepare = vi.fn()
  const batch = vi.fn().mockResolvedValue(batchResults)
  const statement = { bind, first }
  bind.mockReturnValue(statement)
  prepare.mockReturnValue(statement)
  const init: RequestInit = { method }

  if (body !== undefined) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }

  return {
    batch,
    bind,
    context: {
      context: {} as ExecutionContext,
      env: { DB: { batch, prepare } as unknown as D1Database } as AuthEnv,
      request: new Request(
        `https://api.garroveta.es/api/communities/${route.communityId}/badge-settings`,
        init,
      ),
    },
    prepare,
  }
}

describe('Badge settings route', () => {
  it('matches only the endpoint with a safe community identifier', () => {
    expect(
      matchBadgeSettingsRoute(
        '/api/communities/community-crc-delorean/badge-settings',
      ),
    ).toEqual(route)
    expect(
      matchBadgeSettingsRoute('/api/communities/x%2Fy/badge-settings'),
    ).toBeNull()
  })
})

describe('Stored badge settings', () => {
  it('reads an empty column as "use the defaults"', () => {
    expect(parseStoredBadgeSettings('[]')).toEqual({ badges: [] })
    expect(parseStoredBadgeSettings(null)).toEqual({ badges: [] })
  })

  it('never lets a corrupt column break a read', () => {
    expect(parseStoredBadgeSettings('{not json')).toEqual({ badges: [] })
    expect(
      parseStoredBadgeSettings(
        '[{"id":"no-such-badge","name":"X","target":3}]',
      ),
    ).toEqual({ badges: [] })
  })
})

describe('Badge settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authorizeApprovedMember).mockResolvedValue(memberAuthorization())
    vi.mocked(authorizeApprovedManager).mockResolvedValue(
      managerAuthorization(),
    )
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
  })

  it('lets any approved member read the settings', async () => {
    const stored = getDefaultBadgeSettings().badges
    const { context } = createContext({
      row: { badge_settings: JSON.stringify(stored) },
    })

    const response = await handleBadgeSettingsApiRequest(context, route)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ badgeSettings: { badges: stored } })
    expect(authorizeApprovedMember).toHaveBeenCalled()
    expect(authorizeApprovedManager).not.toHaveBeenCalled()
  })

  it('saves the settings and freezes them into the active season at once', async () => {
    const badges = getDefaultBadgeSettings().badges.map((badge) =>
      badge.id === 'ferocious'
        ? { ...badge, name: 'Bestial', target: 6 }
        : badge,
    )
    const { batch, bind, context } = createContext({
      body: { badges },
      method: 'PATCH',
    })

    const response = await handleBadgeSettingsApiRequest(context, route)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ badgeSettings: { badges } })
    expect(batch).toHaveBeenCalledTimes(1)
    expect(batch.mock.calls[0][0]).toHaveLength(2)

    const serialized = JSON.stringify(badges)

    expect(bind).toHaveBeenNthCalledWith(
      1,
      serialized,
      expect.any(String),
      route.communityId,
    )
    expect(bind).toHaveBeenNthCalledWith(
      2,
      serialized,
      expect.any(String),
      route.communityId,
    )
  })

  it('refuses with the same rules as the panel', async () => {
    const badges = getDefaultBadgeSettings().badges.map((badge) =>
      badge.id === 'ferocious' ? { ...badge, target: 0 } : badge,
    )
    const { batch, context } = createContext({
      body: { badges },
      method: 'PATCH',
    })

    const response = await handleBadgeSettingsApiRequest(context, route)

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { code: 'badge_settings_invalid' },
    })
    expect(batch).not.toHaveBeenCalled()
  })

  it('refuses a badge that is not in the catalogue', async () => {
    const { context } = createContext({
      body: { badges: [{ id: 'made-up', name: 'Made up', target: 2 }] },
      method: 'PATCH',
    })

    expect((await handleBadgeSettingsApiRequest(context, route)).status).toBe(
      400,
    )
  })

  it('only lets a manager write', async () => {
    vi.mocked(authorizeApprovedManager).mockResolvedValue({
      authorized: false,
      response: new Response(null, { status: 403 }),
    } as unknown as ManagerAuthorizationResult)
    const { batch, context } = createContext({
      body: { badges: [] },
      method: 'PATCH',
    })

    expect((await handleBadgeSettingsApiRequest(context, route)).status).toBe(
      403,
    )
    expect(batch).not.toHaveBeenCalled()
  })

  it('rejects other methods', async () => {
    const { context } = createContext({ method: 'DELETE' })

    expect((await handleBadgeSettingsApiRequest(context, route)).status).toBe(
      405,
    )
  })
})
