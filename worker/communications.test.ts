import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  authorizeApprovedManager,
  authorizeApprovedMember,
  type ManagerAuthorizationResult,
  type MemberAuthorizationResult,
} from './authorization'
import { type AuthEnv } from './auth'
import {
  handleCommunicationApiRequest,
  matchCommunicationRoute,
} from './communications'

vi.mock('./authorization', () => ({
  authorizeApprovedManager: vi.fn(),
  authorizeApprovedMember: vi.fn(),
}))

const collectionRoute = {
  communityId: 'community-crc-delorean',
  kind: 'collection' as const,
}
const communicationRoute = {
  communicationId: 'communication-summer-hours',
  communityId: 'community-crc-delorean',
  kind: 'communication' as const,
}
const managerMembership = {
  communityId: 'community-crc-delorean',
  displayName: 'Tomás',
  id: 'member-manager',
  role: 'manager' as const,
  status: 'approved' as const,
  userId: 'user-manager',
}
const persistedCommunication = {
  author_display_name: 'Tomás',
  author_member_id: 'member-manager',
  community_id: 'community-crc-delorean',
  content: 'Abrimos a las 17:00 de miércoles a viernes.',
  excerpt: 'El bar abre más tarde durante el verano.',
  id: 'communication-summer-hours',
  pinned: 1,
  published_at: '2026-08-01T10:00:00.000Z',
  tag_ids: '[]',
  title: 'Horario de verano',
  type: 'urgent' as const,
}
const communicationInput = {
  content: 'Abrimos a las 17:00 de miércoles a viernes.',
  excerpt: 'El bar abre más tarde durante el verano.',
  pinned: true,
  tagIds: [],
  title: 'Horario de verano',
  type: 'urgent',
}
const persistedCommunicationWithoutAuthor = Object.fromEntries(
  Object.entries(persistedCommunication).filter(
    ([field]) => field !== 'author_display_name',
  ),
)

function memberAuthorization(
  role: 'manager' | 'moderator' | 'player' = 'manager',
): MemberAuthorizationResult {
  return {
    authorized: true as const,
    value: {
      membership: { ...managerMembership, role },
      user: {
        email: `${role}@example.com`,
        id: `user-${role}`,
        name: role,
      },
    },
  }
}

function managerAuthorization(): ManagerAuthorizationResult {
  return {
    authorized: true,
    value: {
      membership: managerMembership,
      user: {
        email: 'manager@example.com',
        id: 'user-manager',
        name: 'manager',
      },
    },
  }
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
  const prepare = vi.fn((query: string) => {
    void query
    const statement = {
      all: vi.fn().mockResolvedValue({ results: rows }),
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
        'https://api.garroveta.es/api/communities/community-crc-delorean/communications',
        init,
      ),
    },
    prepare,
    statements,
  }
}

describe('Community communication routes', () => {
  it('matches only collection and item routes with safe identifiers', () => {
    expect(
      matchCommunicationRoute(
        '/api/communities/community-crc-delorean/communications',
      ),
    ).toEqual(collectionRoute)
    expect(
      matchCommunicationRoute(
        '/api/communities/community-crc-delorean/communications/communication-summer-hours',
      ),
    ).toEqual(communicationRoute)
    expect(
      matchCommunicationRoute(
        '/api/communities/community%2Fother/communications',
      ),
    ).toBeNull()
  })
})

describe('Community communication API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authorizeApprovedMember).mockResolvedValue(memberAuthorization())
    vi.mocked(authorizeApprovedManager).mockResolvedValue(
      managerAuthorization(),
    )
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
  })

  it('lists every communication for a manager and maps stored values', async () => {
    const { context, prepare, statements } = createContext({
      rows: [persistedCommunication],
    })

    const response = await handleCommunicationApiRequest(
      context,
      collectionRoute,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      communications: [
        {
          authorDisplayName: 'Tomás',
          authorMemberId: 'member-manager',
          communityId: 'community-crc-delorean',
          content: persistedCommunication.content,
          excerpt: persistedCommunication.excerpt,
          id: 'communication-summer-hours',
          pinned: true,
          publishedAt: '2026-08-01T10:00:00.000Z',
          tagIds: [],
          title: 'Horario de verano',
          type: 'urgent',
        },
      ],
    })
    expect(prepare.mock.calls[0]?.[0]).not.toContain('json_each(c.tag_ids)')
    expect(statements[0]?.bind).toHaveBeenCalledWith('community-crc-delorean')
  })

  it('limits a player feed to general or matching targeted communications', async () => {
    vi.mocked(authorizeApprovedMember).mockResolvedValue(
      memberAuthorization('player'),
    )
    const { context, prepare, statements } = createContext()

    await handleCommunicationApiRequest(context, collectionRoute)

    expect(prepare.mock.calls[0]?.[0]).toContain('json_each(c.tag_ids)')
    expect(statements[0]?.bind).toHaveBeenCalledWith(
      'community-crc-delorean',
      'member-manager',
    )
  })

  it('creates a communication for an approved manager', async () => {
    const { context, statements } = createContext({
      body: communicationInput,
      firstResults: [persistedCommunicationWithoutAuthor],
      method: 'POST',
    })

    const response = await handleCommunicationApiRequest(
      context,
      collectionRoute,
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toMatchObject({
      communication: {
        authorDisplayName: 'Tomás',
        pinned: true,
        title: 'Horario de verano',
      },
    })
    expect(statements[0]?.bind).toHaveBeenCalledWith(
      expect.any(String),
      'community-crc-delorean',
      'member-manager',
      'urgent',
      'Horario de verano',
      communicationInput.excerpt,
      communicationInput.content,
      '[]',
      1,
      expect.any(String),
      expect.any(String),
      expect.any(String),
    )
  })

  it('updates and deletes a communication for an approved manager', async () => {
    const update = createContext({
      body: { ...communicationInput, title: 'Horario actualizado' },
      firstResults: [
        { id: 'communication-summer-hours' },
        { ...persistedCommunication, title: 'Horario actualizado' },
      ],
      method: 'PATCH',
    })
    const updated = await handleCommunicationApiRequest(
      update.context,
      communicationRoute,
    )

    expect(updated.status).toBe(200)
    await expect(updated.json()).resolves.toMatchObject({
      communication: { title: 'Horario actualizado' },
    })

    const deletion = createContext({
      firstResults: [{ id: 'communication-summer-hours' }],
      method: 'DELETE',
    })
    const deleted = await handleCommunicationApiRequest(
      deletion.context,
      communicationRoute,
    )

    expect(deleted.status).toBe(200)
    await expect(deleted.json()).resolves.toEqual({
      deletedCommunicationId: 'communication-summer-hours',
    })
  })

  it('rejects invalid communication data before accessing D1', async () => {
    const { context, prepare } = createContext({
      body: { ...communicationInput, type: 'unsupported' },
      method: 'POST',
    })

    const response = await handleCommunicationApiRequest(
      context,
      collectionRoute,
    )

    expect(response.status).toBe(400)
    expect(prepare).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'communication_invalid' },
    })
  })

  it('requires manager access before a communication write', async () => {
    vi.mocked(authorizeApprovedManager).mockResolvedValue({
      authorized: false,
      response: Response.json(
        { error: { code: 'manager_access_required' } },
        { status: 403 },
      ),
    })
    const { context, prepare } = createContext({
      body: communicationInput,
      method: 'POST',
    })

    const response = await handleCommunicationApiRequest(
      context,
      collectionRoute,
    )

    expect(response.status).toBe(403)
    expect(prepare).not.toHaveBeenCalled()
  })
})
