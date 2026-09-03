import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  listCommunityEventStandings,
  saveCommunityEventStanding,
} from './eventStandings'

const communityId = 'community-crc-delorean'
const writeInput = {
  countsForCommunityRanking: true,
  entries: [
    {
      rank: 1,
      displayName: 'Aina Mir',
      eventPoints: 9,
      wins: 3,
      losses: 0,
      draws: 0,
      opponentMatchWinPercentage: 55.5,
      gameWinPercentage: 66.6,
      opponentGameWinPercentage: 50,
    },
  ],
  source: { storeId: '123', externalEventId: '456', roundNumber: 3 },
}

function mockJsonResponse(body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

describe('event standings API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lists the event standings of a community', async () => {
    const fetchMock = mockJsonResponse({ standings: [] })
    vi.stubGlobal('fetch', fetchMock)

    await listCommunityEventStandings(communityId)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/communities/community-crc-delorean/event-standings',
      ),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('saves a standing with a PUT request to its event', async () => {
    const fetchMock = mockJsonResponse({
      standing: {
        id: 'standing-1',
        eventId: 'event-fnm-pauper',
        ...writeInput,
      },
    })
    vi.stubGlobal('fetch', fetchMock)

    await saveCommunityEventStanding(
      communityId,
      'event-fnm-pauper',
      writeInput,
    )

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/event-standings/event-fnm-pauper'),
      expect.objectContaining({
        body: JSON.stringify(writeInput),
        method: 'PUT',
      }),
    )
  })
})
