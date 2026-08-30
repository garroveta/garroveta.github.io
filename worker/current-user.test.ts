import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getAuthenticatedUser } from './authorization'
import { type AuthEnv } from './auth'
import { handleCurrentUserRequest } from './current-user'

vi.mock('./authorization', () => ({
  getAuthenticatedUser: vi.fn(),
}))

function createContext({
  memberships = [],
  method = 'GET',
}: {
  memberships?: unknown[]
  method?: string
} = {}) {
  const all = vi.fn().mockResolvedValue({ results: memberships })
  const bind = vi.fn().mockReturnValue({ all })
  const prepare = vi.fn().mockReturnValue({ bind })

  return {
    all,
    bind,
    context: {
      context: {} as ExecutionContext,
      env: { DB: { prepare } as unknown as D1Database } as AuthEnv,
      request: new Request('https://api.garroveta.es/api/me', { method }),
    },
    prepare,
  }
}

describe('Current user API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('rejects unsupported methods before reading the session', async () => {
    const { context } = createContext({ method: 'POST' })

    const response = await handleCurrentUserRequest(context)

    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('GET')
    expect(getAuthenticatedUser).not.toHaveBeenCalled()
  })
})
