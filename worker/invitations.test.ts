import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type AuthEnv } from './auth'
import { authorizeApprovedManager, getAuthenticatedUser } from './authorization'
import {
  createInvitationToken,
  handleInvitationApiRequest,
  hashInvitationToken,
  matchInvitationRoute,
} from './invitations'

vi.mock('./authorization', () => ({
  authorizeApprovedManager: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))

interface StatementBehavior {
  all?: unknown
  first?: unknown
  run?: unknown
}

interface PreparedStatementMock {
  all: ReturnType<typeof vi.fn>
  bind: ReturnType<typeof vi.fn>
  first: ReturnType<typeof vi.fn>
  run: ReturnType<typeof vi.fn>
}

function createDatabase(behaviors: StatementBehavior[]) {
  const statements: PreparedStatementMock[] = []
  const prepare = vi.fn(() => {
    const behavior = behaviors.shift() ?? {}
    const statement: PreparedStatementMock = {
      all: vi.fn().mockResolvedValue(behavior.all),
      bind: vi.fn(),
      first: vi.fn().mockResolvedValue(behavior.first),
      run: vi.fn().mockResolvedValue(behavior.run ?? { success: true }),
    }
    statement.bind.mockReturnValue(statement)
    statements.push(statement)
    return statement as unknown as D1PreparedStatement
  })
  const batch = vi.fn().mockResolvedValue([
    { meta: { changes: 1 }, success: true },
    { meta: { changes: 1 }, success: true },
  ])

  return {
    batch,
    db: { batch, prepare } as unknown as D1Database,
    prepare,
    statements,
  }
}

function createContext(request: Request, db: D1Database) {
  return {
    context: {} as ExecutionContext,
    env: {
      APP_ORIGIN: 'https://garroveta.es',
      BETTER_AUTH_SECRET: 'test-secret-with-at-least-32-characters',
      BETTER_AUTH_URL: 'https://api.garroveta.es',
      DB: db,
      RESEND_API_KEY: 'test-resend-key',
      RESEND_FROM_EMAIL: 'Garroveta <noreply@garroveta.es>',
    } as AuthEnv,
    request,
  }
}

const collectionRoute = {
  communityId: 'community-crc-delorean',
  kind: 'collection' as const,
}

const revokeRoute = {
  communityId: 'community-crc-delorean',
  invitationId: 'invite-id',
  kind: 'revoke' as const,
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

const authenticatedPlayer = {
  email: 'player@example.com',
  id: 'user-player',
  name: 'Marina Valverde',
}

const activeInvitation = {
  city: 'Inca',
  community_id: 'community-crc-delorean',
  community_name: 'CRC Delorean',
  expires_at: '2099-01-01T00:00:00.000Z',
  id: 'invite-id',
  revoked_at: null,
  used_at: null,
  used_by_user_id: null,
}

const approvedMembership = {
  display_name: 'Marina Valverde',
  id: 'member-player',
  role: 'player' as const,
  status: 'approved' as const,
}

describe('Invitation routes and cryptography', () => {
  it('matches only supported invitation routes with safe identifiers', () => {
    expect(matchInvitationRoute('/api/invitations/validate')).toEqual({
      kind: 'validate',
    })
    expect(matchInvitationRoute('/api/invitations/redeem')).toEqual({
      kind: 'redeem',
    })
    expect(
      matchInvitationRoute(
        '/api/communities/community-crc-delorean/invitations',
      ),
    ).toEqual(collectionRoute)
    expect(
      matchInvitationRoute(
        '/api/communities/community-crc-delorean/invitations/invite-id/revoke',
      ),
    ).toEqual(revokeRoute)
    expect(
      matchInvitationRoute('/api/communities/community%2Fother/invitations'),
    ).toBeNull()
  })

  it('creates opaque 256-bit tokens and SHA-256 hashes', async () => {
    const first = await createInvitationToken()
    const second = await createInvitationToken()

    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(first.hash).toMatch(/^[a-f0-9]{64}$/)
    expect(first.token).not.toBe(second.token)
    expect(first.hash).toBe(await hashInvitationToken(first.token))
  })
})

describe('Invitation manager API', () => {
  beforeEach(() => {
    vi.mocked(authorizeApprovedManager).mockResolvedValue(managerAuthorization)
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
  })

  it('creates an invitation and returns its secret only in the initial hash URL', async () => {
    const database = createDatabase([{}])
    const request = new Request(
      'https://api.garroveta.es/api/communities/community-crc-delorean/invitations',
      {
        body: JSON.stringify({
          expiresInDays: 7,
          label: '  FNM du vendredi  ',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
    )

    const response = await handleInvitationApiRequest(
      createContext(request, database.db),
      collectionRoute,
    )
    const body = (await response.json()) as {
      invitation: { inviteUrl: string; label: string; status: string }
    }
    const invitationUrl = new URL(body.invitation.inviteUrl)
    const token = new URLSearchParams(invitationUrl.hash.split('?')[1]).get(
      'invite',
    )
    const boundValues = database.statements[0]?.bind.mock.calls[0]

    expect(response.status).toBe(201)
    expect(body.invitation.label).toBe('FNM du vendredi')
    expect(body.invitation.status).toBe('active')
    expect(invitationUrl.pathname).toBe('/')
    expect(invitationUrl.hash.startsWith('#registro?invite=')).toBe(true)
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(boundValues?.[2]).toBe(await hashInvitationToken(token!))
    expect(boundValues).not.toContain(token)
  })

  it('rejects invalid expiration before writing to D1', async () => {
    const database = createDatabase([])
    const request = new Request(
      'https://api.garroveta.es/api/communities/community-crc-delorean/invitations',
      {
        body: JSON.stringify({ expiresInDays: 0 }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
    )

    const response = await handleInvitationApiRequest(
      createContext(request, database.db),
      collectionRoute,
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'invalid_expiration' },
    })
    expect(database.prepare).not.toHaveBeenCalled()
  })

  it('lists invitation metadata without hashes or secret tokens', async () => {
    const database = createDatabase([
      {
        all: {
          results: [
            {
              community_id: 'community-crc-delorean',
              created_at: '2026-08-28T00:00:00.000Z',
              created_by_member_id: 'member-manager',
              expires_at: '2026-09-27T00:00:00.000Z',
              id: 'invite-id',
              label: 'FNM',
              revoked_at: null,
              status: 'active',
              used_at: null,
            },
          ],
        },
      },
    ])
    const request = new Request(
      'https://api.garroveta.es/api/communities/community-crc-delorean/invitations',
    )

    const response = await handleInvitationApiRequest(
      createContext(request, database.db),
      collectionRoute,
    )
    const responseText = await response.text()

    expect(response.status).toBe(200)
    expect(responseText).toContain('"status":"active"')
    expect(responseText).not.toContain('token')
    expect(responseText).not.toContain('hash')
  })

  it('revokes an active invitation atomically', async () => {
    const revokedAt = '2026-08-28T12:00:00.000Z'
    const database = createDatabase([
      {
        first: {
          community_id: 'community-crc-delorean',
          created_at: '2026-08-28T00:00:00.000Z',
          created_by_member_id: 'member-manager',
          expires_at: '2026-09-27T00:00:00.000Z',
          id: 'invite-id',
          label: null,
          revoked_at: revokedAt,
          status: 'revoked',
          used_at: null,
        },
      },
    ])
    const request = new Request(
      'https://api.garroveta.es/api/communities/community-crc-delorean/invitations/invite-id/revoke',
      { method: 'POST' },
    )

    const response = await handleInvitationApiRequest(
      createContext(request, database.db),
      revokeRoute,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      invitation: { id: 'invite-id', status: 'revoked' },
    })
    expect(database.statements[0]?.bind.mock.calls[0]?.slice(1, 4)).toEqual([
      'member-manager',
      'invite-id',
      'community-crc-delorean',
    ])
  })

  it('reports a terminal invitation state when revocation cannot proceed', async () => {
    const database = createDatabase([
      { first: null },
      {
        first: {
          expires_at: '2026-09-27T00:00:00.000Z',
          revoked_at: null,
          used_at: '2026-08-28T00:00:00.000Z',
        },
      },
    ])
    const request = new Request(
      'https://api.garroveta.es/api/communities/community-crc-delorean/invitations/invite-id/revoke',
      { method: 'POST' },
    )

    const response = await handleInvitationApiRequest(
      createContext(request, database.db),
      revokeRoute,
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'invitation_used' },
    })
  })

  it.each([401, 403])(
    'blocks every manager endpoint when authorization returns %i',
    async (status) => {
      const requests = [
        {
          request: new Request(
            'https://api.garroveta.es/api/communities/community-crc-delorean/invitations',
          ),
          route: collectionRoute,
        },
        {
          request: new Request(
            'https://api.garroveta.es/api/communities/community-crc-delorean/invitations',
            { method: 'POST' },
          ),
          route: collectionRoute,
        },
        {
          request: new Request(
            'https://api.garroveta.es/api/communities/community-crc-delorean/invitations/invite-id/revoke',
            { method: 'POST' },
          ),
          route: revokeRoute,
        },
      ]

      for (const { request, route } of requests) {
        vi.mocked(authorizeApprovedManager).mockResolvedValueOnce({
          authorized: false,
          response: new Response(null, { status }),
        })
        const database = createDatabase([])
        const response = await handleInvitationApiRequest(
          createContext(request, database.db),
          route,
        )

        expect(response.status).toBe(status)
        expect(database.prepare).not.toHaveBeenCalled()
      }
    },
  )
})

describe('Invitation public API', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(authenticatedPlayer)
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
  })

  it('validates an invitation while exposing only community, expiration and status', async () => {
    const database = createDatabase([{ first: activeInvitation }])
    const token = (await createInvitationToken()).token
    const request = new Request(
      `https://api.garroveta.es/api/invitations/validate?invite=${token}`,
    )

    const response = await handleInvitationApiRequest(
      createContext(request, database.db),
      { kind: 'validate' },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      community: { city: 'Inca', name: 'CRC Delorean' },
      expiresAt: '2099-01-01T00:00:00.000Z',
      status: 'active',
    })
    expect(database.statements[0]?.bind.mock.calls[0]?.[0]).toBe(
      await hashInvitationToken(token),
    )
  })

  it('returns invalid without querying D1 for malformed tokens', async () => {
    const database = createDatabase([])
    const request = new Request(
      'https://api.garroveta.es/api/invitations/validate?invite=short',
    )

    const response = await handleInvitationApiRequest(
      createContext(request, database.db),
      { kind: 'validate' },
    )

    await expect(response.json()).resolves.toEqual({ status: 'invalid' })
    expect(database.prepare).not.toHaveBeenCalled()
  })

  it('consumes an invitation and creates or approves a player in one D1 batch', async () => {
    const token = (await createInvitationToken()).token
    const usedInvitation = {
      ...activeInvitation,
      used_at: '2026-08-28T12:00:00.000Z',
      used_by_user_id: authenticatedPlayer.id,
    }
    const database = createDatabase([
      {},
      {},
      { first: usedInvitation },
      { first: approvedMembership },
    ])
    const request = new Request(
      'https://api.garroveta.es/api/invitations/redeem',
      {
        body: JSON.stringify({
          displayName: 'Marina Valverde',
          favoriteGameIds: ['game-mtg'],
          invite: token,
          tagIds: ['tag-commander'],
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
    )

    const response = await handleInvitationApiRequest(
      createContext(request, database.db),
      { kind: 'redeem' },
    )

    expect(response.status).toBe(200)
    expect(database.batch).toHaveBeenCalledOnce()
    expect(database.batch.mock.calls[0]?.[0]).toHaveLength(2)
    await expect(response.json()).resolves.toEqual({
      membership: {
        communityId: 'community-crc-delorean',
        displayName: 'Marina Valverde',
        id: 'member-player',
        role: 'player',
        status: 'approved',
      },
      status: 'success',
    })
  })

  it('is idempotent when the same user consumes the invitation again', async () => {
    const token = (await createInvitationToken()).token
    const database = createDatabase([
      {},
      {},
      {
        first: {
          ...activeInvitation,
          used_at: '2026-08-28T12:00:00.000Z',
          used_by_user_id: authenticatedPlayer.id,
        },
      },
      { first: approvedMembership },
    ])

    const response = await handleInvitationApiRequest(
      createContext(
        new Request('https://api.garroveta.es/api/invitations/redeem', {
          body: JSON.stringify({
            displayName: 'Marina Valverde',
            invite: token,
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        }),
        database.db,
      ),
      { kind: 'redeem' },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ status: 'success' })
  })

  it('prevents a second user from consuming an invitation', async () => {
    const token = (await createInvitationToken()).token
    const database = createDatabase([
      {},
      {},
      {
        first: {
          ...activeInvitation,
          used_at: '2026-08-28T12:00:00.000Z',
          used_by_user_id: 'another-user',
        },
      },
      { first: null },
    ])

    const response = await handleInvitationApiRequest(
      createContext(
        new Request('https://api.garroveta.es/api/invitations/redeem', {
          body: JSON.stringify({
            displayName: 'Marina Valverde',
            invite: token,
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        }),
        database.db,
      ),
      { kind: 'redeem' },
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'used' },
    })
  })

  it.each([
    {
      code: 'revoked',
      state: {
        ...activeInvitation,
        revoked_at: '2026-08-28T12:00:00.000Z',
      },
    },
    {
      code: 'expired',
      state: {
        ...activeInvitation,
        expires_at: '2020-01-01T00:00:00.000Z',
      },
    },
  ])('refuses a $code invitation', async ({ code, state }) => {
    const token = (await createInvitationToken()).token
    const database = createDatabase([{}, {}, { first: state }, { first: null }])
    const response = await handleInvitationApiRequest(
      createContext(
        new Request('https://api.garroveta.es/api/invitations/redeem', {
          body: JSON.stringify({
            displayName: 'Marina Valverde',
            invite: token,
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        }),
        database.db,
      ),
      { kind: 'redeem' },
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: { code },
    })
  })

  it.each([
    { code: 'already_member', status: 'approved', responseStatus: 409 },
    { code: 'membership_suspended', status: 'suspended', responseStatus: 403 },
  ] as const)(
    'does not consume an invitation for an existing $status member',
    async ({ code, status, responseStatus }) => {
      const token = (await createInvitationToken()).token
      const database = createDatabase([
        {},
        {},
        { first: activeInvitation },
        {
          first: {
            ...approvedMembership,
            status,
          },
        },
      ])
      const response = await handleInvitationApiRequest(
        createContext(
          new Request('https://api.garroveta.es/api/invitations/redeem', {
            body: JSON.stringify({
              displayName: 'Marina Valverde',
              invite: token,
            }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
          }),
          database.db,
        ),
        { kind: 'redeem' },
      )

      expect(response.status).toBe(responseStatus)
      await expect(response.json()).resolves.toMatchObject({
        error: { code },
      })
    },
  )

  it('requires authentication before reading or consuming an invitation', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValueOnce(null)
    const token = (await createInvitationToken()).token
    const database = createDatabase([])
    const request = new Request(
      'https://api.garroveta.es/api/invitations/redeem',
      {
        body: JSON.stringify({
          displayName: 'Marina Valverde',
          invite: token,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
    )

    const response = await handleInvitationApiRequest(
      createContext(request, database.db),
      { kind: 'redeem' },
    )

    expect(response.status).toBe(401)
    expect(database.prepare).not.toHaveBeenCalled()
  })
})
