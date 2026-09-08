import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getAuthenticatedUser } from './authorization'
import { type AuthEnv } from './auth'
import { handleCurrentUserRequest } from './current-user'
import { safelyReconcileActiveSeasonStandingEntries } from './standing-member-reconciliation'

vi.mock('./authorization', () => ({
  getAuthenticatedUser: vi.fn(),
}))

vi.mock('./standing-member-reconciliation', () => ({
  safelyReconcileActiveSeasonStandingEntries: vi.fn(),
}))

function createContext({
  body,
  memberships = [],
  method = 'GET',
  updatedMembership = null,
}: {
  body?: unknown
  memberships?: unknown[]
  method?: string
  updatedMembership?: unknown
} = {}) {
  const all = vi.fn().mockResolvedValue({ results: memberships })
  const first = vi.fn().mockResolvedValue(updatedMembership)
  const bind = vi.fn().mockReturnValue({ all, first })
  const prepare = vi.fn().mockReturnValue({ bind })
  const requestInit: RequestInit = { method }

  if (body !== undefined) {
    requestInit.body = JSON.stringify(body)
    requestInit.headers = { 'Content-Type': 'application/json' }
  }

  return {
    all,
    bind,
    context: {
      context: {} as ExecutionContext,
      env: { DB: { prepare } as unknown as D1Database } as AuthEnv,
      request: new Request('https://api.garroveta.es/api/me', requestInit),
    },
    first,
    prepare,
  }
}

describe('Current user API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(safelyReconcileActiveSeasonStandingEntries).mockResolvedValue({
      linkedEntries: 0,
      status: 'unmatched',
    })
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      email: 'tom@example.com',
      id: 'user-manager',
      name: 'Tom',
    })
  })

  it('returns the session and every community membership', async () => {
    const { bind, context } = createContext({
      memberships: [
        {
          city: 'Inca',
          community_id: 'community-crc-delorean',
          community_name: 'CRC Delorean',
          community_slug: 'crc-delorean',
          display_name: 'Tomás',
          favorite_game_ids: '["game-mtg"]',
          id: 'member-manager',
          joined_at: '2026-08-30T10:00:00.000Z',
          role: 'manager',
          status: 'approved',
          tag_ids: '["tag-pauper"]',
        },
      ],
    })

    const response = await handleCurrentUserRequest(context)

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      memberships: [
        {
          community: {
            city: 'Inca',
            id: 'community-crc-delorean',
            name: 'CRC Delorean',
            slug: 'crc-delorean',
          },
          contactMethods: [],
          displayName: 'Tomás',
          favoriteGameIds: ['game-mtg'],
          id: 'member-manager',
          joinedAt: '2026-08-30T10:00:00.000Z',
          role: 'manager',
          status: 'approved',
          tagIds: ['tag-pauper'],
        },
      ],
      user: {
        email: 'tom@example.com',
        id: 'user-manager',
        name: 'Tom',
      },
    })
    expect(bind).toHaveBeenCalledWith('user-manager')
  })

  it('returns an authenticated account without a membership', async () => {
    const { context } = createContext()

    const response = await handleCurrentUserRequest(context)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ memberships: [] })
  })

  it('requires an authenticated session', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null)
    const { context, prepare } = createContext()

    const response = await handleCurrentUserRequest(context)

    expect(response.status).toBe(401)
    expect(prepare).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'authentication_required' },
    })
  })

  it('updates the approved membership profile and preferences', async () => {
    const { bind, context } = createContext({
      body: {
        communityId: 'community-crc-delorean',
        displayName: '  Tomás Garau  ',
        favoriteGameIds: ['game-mtg', 'game-one-piece', 'game-mtg'],
        tagIds: ['tag-pauper', 'tag-commander'],
      },
      method: 'PATCH',
      updatedMembership: {
        community_id: 'community-crc-delorean',
        display_name: 'Tomás Garau',
        favorite_game_ids: '["game-mtg","game-one-piece"]',
        id: 'member-manager',
        tag_ids: '["tag-pauper","tag-commander"]',
      },
    })

    const response = await handleCurrentUserRequest(context)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      membership: {
        communityId: 'community-crc-delorean',
        contactMethods: [],
        displayName: 'Tomás Garau',
        favoriteGameIds: ['game-mtg', 'game-one-piece'],
        id: 'member-manager',
        tagIds: ['tag-pauper', 'tag-commander'],
      },
    })
    expect(bind).toHaveBeenCalledWith(
      'Tomás Garau',
      '["game-mtg","game-one-piece"]',
      '["tag-pauper","tag-commander"]',
      '[]',
      expect.any(String),
      'community-crc-delorean',
      'user-manager',
    )
    expect(safelyReconcileActiveSeasonStandingEntries).toHaveBeenCalledWith(
      context.env.DB,
      'community-crc-delorean',
      'member-manager',
      'Tomás Garau',
    )
  })

  it('rejects invalid profile updates before accessing D1', async () => {
    const { context, prepare } = createContext({
      body: {
        communityId: 'community-crc-delorean',
        displayName: '   ',
        favoriteGameIds: ['game-mtg'],
        tagIds: [],
      },
      method: 'PATCH',
    })

    const response = await handleCurrentUserRequest(context)

    expect(response.status).toBe(400)
    expect(prepare).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'profile_invalid' },
    })
  })

  it('does not update a missing or non-approved membership', async () => {
    const { context } = createContext({
      body: {
        communityId: 'community-crc-delorean',
        displayName: 'Tomás',
        favoriteGameIds: ['game-mtg'],
        tagIds: [],
      },
      method: 'PATCH',
    })

    const response = await handleCurrentUserRequest(context)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'membership_access_required' },
    })
  })

  it('rejects unsupported methods before reading the session', async () => {
    const { context } = createContext({ method: 'POST' })

    const response = await handleCurrentUserRequest(context)

    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('GET, PATCH')
    expect(getAuthenticatedUser).not.toHaveBeenCalled()
  })

  it('stores the contact details a member chooses to share', async () => {
    const { bind, context } = createContext({
      body: {
        communityId: 'community-crc-delorean',
        contactMethods: [
          {
            kind: 'whatsapp',
            label: '  WhatsApp  ',
            value: '  +34600111222  ',
          },
          { kind: 'discord', label: 'Discord', value: 'alex#1234' },
        ],
        displayName: 'Álex Romero',
        favoriteGameIds: ['game-mtg'],
        tagIds: [],
      },
      method: 'PATCH',
      updatedMembership: {
        community_id: 'community-crc-delorean',
        contact_methods:
          '[{"kind":"whatsapp","label":"WhatsApp","value":"+34600111222"},{"kind":"discord","label":"Discord","value":"alex#1234"}]',
        display_name: 'Álex Romero',
        favorite_game_ids: '["game-mtg"]',
        id: 'member-alex',
        tag_ids: '[]',
      },
    })

    const response = await handleCurrentUserRequest(context)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      membership: {
        contactMethods: [
          { kind: 'whatsapp', label: 'WhatsApp', value: '+34600111222' },
          { kind: 'discord', label: 'Discord', value: 'alex#1234' },
        ],
      },
    })
    expect(bind).toHaveBeenCalledWith(
      'Álex Romero',
      '["game-mtg"]',
      '[]',
      '[{"kind":"whatsapp","label":"WhatsApp","value":"+34600111222"},{"kind":"discord","label":"Discord","value":"alex#1234"}]',
      expect.any(String),
      'community-crc-delorean',
      'user-manager',
    )
  })

  it.each([
    [
      'an unsupported kind',
      [{ kind: 'telegram', label: 'Telegram', value: '@alex' }],
    ],
    [
      'a repeated kind',
      [
        { kind: 'email', label: 'Correo', value: 'a@example.com' },
        { kind: 'email', label: 'Otro', value: 'b@example.com' },
      ],
    ],
    ['an empty value', [{ kind: 'email', label: 'Correo', value: '   ' }]],
    [
      'too many entries',
      [
        { kind: 'email', label: 'Correo', value: 'a@example.com' },
        { kind: 'discord', label: 'Discord', value: 'alex' },
        { kind: 'whatsapp', label: 'WhatsApp', value: '+34600111222' },
        { kind: 'email', label: 'Correo', value: 'c@example.com' },
      ],
    ],
  ])('rejects contact details with %s', async (_case, contactMethods) => {
    const { context, prepare } = createContext({
      body: {
        communityId: 'community-crc-delorean',
        contactMethods,
        displayName: 'Álex Romero',
        favoriteGameIds: [],
        tagIds: [],
      },
      method: 'PATCH',
    })

    const response = await handleCurrentUserRequest(context)

    expect(response.status).toBe(400)
    expect(prepare).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'profile_invalid' },
    })
  })

  it('reads a corrupt stored value as no contact details', async () => {
    const { context } = createContext({
      memberships: [
        {
          city: 'Inca',
          community_id: 'community-crc-delorean',
          community_name: 'CRC Delorean',
          community_slug: 'crc-delorean',
          contact_methods: 'not json',
          display_name: 'Álex',
          favorite_game_ids: '[]',
          id: 'member-alex',
          joined_at: '2026-08-30T10:00:00.000Z',
          role: 'player',
          status: 'approved',
          tag_ids: '[]',
        },
      ],
    })

    const response = await handleCurrentUserRequest(context)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      memberships: [{ contactMethods: [] }],
    })
  })
})
