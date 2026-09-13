import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  activateCommunityRankingSeason,
  closeCommunityRankingSeason,
  createCommunityRankingSeason,
  deleteCommunityRankingSeason,
  listCommunityRankingSeasons,
  updateCommunityRankingSeason,
} from './rankingSeasons'

const communityId = 'community-crc-delorean'
const points = {
  first: 10,
  second: 8,
  third: 6,
  fourth: 5,
  fifth: 4,
  sixthToTenth: 3,
  participation: 1,
}
const seasonInput = {
  name: 'Temporada 2027',
  startsOn: '2027-01-01',
  endsOn: '2027-12-31',
  points,
}

function mockJsonResponse(body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

describe('ranking seasons API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lists the ranking seasons of a community', async () => {
    const fetchMock = mockJsonResponse({ seasons: [] })
    vi.stubGlobal('fetch', fetchMock)

    await listCommunityRankingSeasons(communityId)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/communities/community-crc-delorean/ranking-seasons',
      ),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('creates a new season with a POST request', async () => {
    const fetchMock = mockJsonResponse({
      season: { id: 'season-2027', ...seasonInput, status: 'upcoming' },
    })
    vi.stubGlobal('fetch', fetchMock)

    await createCommunityRankingSeason(communityId, seasonInput)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/ranking-seasons'),
      expect.objectContaining({
        body: JSON.stringify(seasonInput),
        method: 'POST',
      }),
    )
  })

  it('updates the points or the dates of a season with a PATCH request', async () => {
    const fetchMock = mockJsonResponse({
      season: { id: 'season-2027', ...seasonInput, status: 'active' },
    })
    vi.stubGlobal('fetch', fetchMock)

    await updateCommunityRankingSeason(communityId, 'season-2027', { points })
    await updateCommunityRankingSeason(communityId, 'season-2027', {
      endsOn: '2028-03-31',
    })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/ranking-seasons/season-2027'),
      expect.objectContaining({
        body: JSON.stringify({ points }),
        method: 'PATCH',
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/ranking-seasons/season-2027'),
      expect.objectContaining({
        body: JSON.stringify({ endsOn: '2028-03-31' }),
        method: 'PATCH',
      }),
    )
  })

  it('deletes an upcoming season with a DELETE request', async () => {
    const fetchMock = mockJsonResponse({ deletedSeasonId: 'season-2027' })
    vi.stubGlobal('fetch', fetchMock)

    await deleteCommunityRankingSeason(communityId, 'season-2027')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/ranking-seasons/season-2027'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('activates a season through its dedicated endpoint', async () => {
    const fetchMock = mockJsonResponse({
      season: { id: 'season-2027', ...seasonInput, status: 'active' },
    })
    vi.stubGlobal('fetch', fetchMock)

    await activateCommunityRankingSeason(communityId, 'season-2027')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/ranking-seasons/season-2027/activate'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('closes a season through its dedicated endpoint', async () => {
    const fetchMock = mockJsonResponse({
      season: {
        id: 'season-2026',
        ...seasonInput,
        eligibleMemberIds: [],
        status: 'closed',
      },
    })
    vi.stubGlobal('fetch', fetchMock)

    await closeCommunityRankingSeason(communityId, 'season-2026')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/ranking-seasons/season-2026/close'),
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
