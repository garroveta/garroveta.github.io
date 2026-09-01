import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  cancelPersistedEventRegistration,
  createCommunityEvent,
  deletePersistedCommunityEvent,
  listCommunityEvents,
  listPersistedEventRegistrations,
  registerForPersistedEvent,
  removePersistedEventRegistration,
  updatePersistedCommunityEvent,
  type CommunityEventWriteInput,
} from './communityEvents'

const eventInput: CommunityEventWriteInput = {
  capacity: 16,
  competitionEventKindId: 'event-kind-fnm',
  countsForCommunityRanking: true,
  description: 'Tres rondas de Standard.',
  endsAt: '2026-09-04T21:00:00.000Z',
  formatId: 'format-standard',
  gameId: 'game-mtg',
  listedInAgenda: true,
  registrationEnabled: true,
  startsAt: '2026-09-04T16:00:00.000Z',
  tagIds: ['tag-standard'],
  title: 'FNM Standard',
  type: 'tournament',
  waitlistEnabled: true,
}

function mockJsonResponse(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
      status,
    }),
  )
}

describe('community event API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lists persisted events for the authenticated community member', async () => {
    const fetchMock = mockJsonResponse({ events: [], registrations: [] })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      listCommunityEvents('community-crc-delorean'),
    ).resolves.toEqual({ events: [], registrations: [] })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/communities/community-crc-delorean/events'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('uses the shared registration endpoints for players and managers', async () => {
    const fetchMock = mockJsonResponse({ registrations: [] })
    vi.stubGlobal('fetch', fetchMock)

    await registerForPersistedEvent('community-crc-delorean', 'event-id')
    await cancelPersistedEventRegistration('community-crc-delorean', 'event-id')
    await listPersistedEventRegistrations('community-crc-delorean', 'event-id')
    await removePersistedEventRegistration(
      'community-crc-delorean',
      'event-id',
      'member-id',
    )

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/events\/event-id\/registrations$/),
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/events\/event-id\/registrations\/me$/),
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      expect.stringMatching(/\/events\/event-id\/registrations$/),
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      expect.stringMatching(/\/events\/event-id\/registrations\/member-id$/),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('creates, updates and deletes events through manager endpoints', async () => {
    const fetchMock = mockJsonResponse({ event: { id: 'event-id' } }, 201)
    vi.stubGlobal('fetch', fetchMock)

    await createCommunityEvent('community-crc-delorean', eventInput)
    await updatePersistedCommunityEvent(
      'community-crc-delorean',
      'event-id',
      eventInput,
    )
    await deletePersistedCommunityEvent('community-crc-delorean', 'event-id')

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/events$/),
      expect.objectContaining({
        body: JSON.stringify(eventInput),
        credentials: 'include',
        method: 'POST',
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/events\/event-id$/),
      expect.objectContaining({
        body: JSON.stringify(eventInput),
        method: 'PATCH',
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      expect.stringMatching(/\/events\/event-id$/),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
