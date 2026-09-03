import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  authorizeApprovedManager,
  authorizeApprovedMember,
  type ManagerAuthorizationResult,
  type MemberAuthorizationResult,
} from './authorization'
import { type AuthEnv } from './auth'
import {
  handleRegistrationSettingsApiRequest,
  matchRegistrationSettingsRoute,
} from './registration-settings'

vi.mock('./authorization', () => ({
  authorizeApprovedManager: vi.fn(),
  authorizeApprovedMember: vi.fn(),
}))

const route = { communityId: 'community-crc-delorean' }
const settings = {
  rules: [
    {
      eventType: 'tournament',
      enabledByDefault: false,
      defaultCapacity: 24,
      waitlistEnabled: true,
    },
    {
      eventType: 'league',
      enabledByDefault: false,
      defaultCapacity: 24,
      waitlistEnabled: true,
    },
    {
      eventType: 'draft',
      enabledByDefault: true,
      defaultCapacity: 4,
      waitlistEnabled: true,
    },
    {
      eventType: 'casual',
      enabledByDefault: false,
      defaultCapacity: 24,
      waitlistEnabled: false,
    },
    {
      eventType: 'workshop',
      enabledByDefault: false,
      defaultCapacity: 12,
      waitlistEnabled: false,
    },
    {
      eventType: 'launch',
      enabledByDefault: true,
      defaultCapacity: 30,
      waitlistEnabled: true,
    },
  ],
} as const

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
      user: {
        email: 'manager@example.com',
        id: 'user-manager',
        name: 'Tomás',
      },
    },
  }
}

function createContext({
  body,
  method = 'GET',
  rows = [],
}: {
  body?: unknown
  method?: string
  rows?: unknown[]
} = {}) {
  const all = vi.fn().mockResolvedValue({ results: rows })
  const bind = vi.fn()
  const prepare = vi.fn()
  const batch = vi.fn().mockResolvedValue([])
  const statement = { all, bind }
  bind.mockReturnValue(statement)
  prepare.mockReturnValue(statement)
  const init: RequestInit = { method }

  if (body !== undefined) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }

  return {
    all,
    batch,
    bind,
    context: {
      context: {} as ExecutionContext,
      env: { DB: { batch, prepare } as unknown as D1Database } as AuthEnv,
      request: new Request(
        `https://api.garroveta.es/api/communities/${route.communityId}/registration-settings`,
        init,
      ),
    },
    prepare,
  }
}

describe('Registration settings route', () => {
  it('matches only a settings endpoint with a safe community identifier', () => {
    expect(
      matchRegistrationSettingsRoute(
        '/api/communities/community-crc-delorean/registration-settings',
      ),
    ).toEqual(route)
    expect(
      matchRegistrationSettingsRoute(
        '/api/communities/community%2Fother/registration-settings',
      ),
    ).toBeNull()
  })
})

describe('Registration settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authorizeApprovedMember).mockResolvedValue(memberAuthorization())
    vi.mocked(authorizeApprovedManager).mockResolvedValue(
      managerAuthorization(),
    )
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
  })

  it('returns persisted rules and default values for missing event types', async () => {
    const { context } = createContext({
      rows: [
        {
          event_type: 'draft',
          enabled_by_default: 1,
          default_capacity: 4,
          waitlist_enabled: 1,
        },
      ],
    })

    const response = await handleRegistrationSettingsApiRequest(context, route)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      registrationSettings: {
        rules: [
          { eventType: 'tournament', defaultCapacity: 24 },
          { eventType: 'league', defaultCapacity: 24 },
          { eventType: 'draft', defaultCapacity: 4 },
          { eventType: 'casual', defaultCapacity: 24 },
          { eventType: 'workshop', defaultCapacity: 12 },
          { eventType: 'launch', defaultCapacity: 30 },
        ],
      },
    })
    expect(authorizeApprovedMember).toHaveBeenCalledOnce()
  })

  it('upserts all rules atomically for an approved manager', async () => {
    const { batch, bind, context, prepare } = createContext({
      body: settings,
      method: 'PATCH',
    })

    const response = await handleRegistrationSettingsApiRequest(context, route)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      registrationSettings: settings,
    })
    expect(prepare).toHaveBeenCalledTimes(6)
    expect(bind).toHaveBeenCalledWith(
      route.communityId,
      'draft',
      1,
      4,
      1,
      expect.any(String),
    )
    expect(batch).toHaveBeenCalledOnce()
    expect(authorizeApprovedManager).toHaveBeenCalledOnce()
  })

  it('rejects duplicate event types without writing to D1', async () => {
    const duplicateSettings = {
      rules: settings.rules.map((rule, index) =>
        index === 1 ? { ...rule, eventType: 'tournament' } : rule,
      ),
    }
    const { batch, context, prepare } = createContext({
      body: duplicateSettings,
      method: 'PATCH',
    })

    const response = await handleRegistrationSettingsApiRequest(context, route)

    expect(response.status).toBe(400)
    expect(prepare).not.toHaveBeenCalled()
    expect(batch).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'registration_settings_invalid' },
    })
  })

  it('rejects capacities outside the supported range', async () => {
    const invalidSettings = {
      rules: settings.rules.map((rule) =>
        rule.eventType === 'draft' ? { ...rule, defaultCapacity: 0 } : rule,
      ),
    }
    const { batch, context } = createContext({
      body: invalidSettings,
      method: 'PATCH',
    })

    const response = await handleRegistrationSettingsApiRequest(context, route)

    expect(response.status).toBe(400)
    expect(batch).not.toHaveBeenCalled()
  })

  it('checks manager access before parsing an update', async () => {
    vi.mocked(authorizeApprovedManager).mockResolvedValue({
      authorized: false,
      response: Response.json(
        { error: { code: 'manager_access_required' } },
        { status: 403 },
      ),
    })
    const { batch, context } = createContext({
      body: settings,
      method: 'PATCH',
    })

    const response = await handleRegistrationSettingsApiRequest(context, route)

    expect(response.status).toBe(403)
    expect(batch).not.toHaveBeenCalled()
  })
})
