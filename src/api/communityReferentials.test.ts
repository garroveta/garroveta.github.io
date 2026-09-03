import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CommunityOptionInput } from '../data/communityOptions'
import {
  createCommunityReferential,
  deleteCommunityReferential,
  listCommunityReferentials,
  reorderCommunityReferentials,
  updateCommunityReferential,
} from './communityReferentials'

function mockJsonResponse(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue(
    new Response(status === 204 ? null : JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
      status,
    }),
  )
}

const seriesInput: CommunityOptionInput = {
  name: 'Regional Championship Qualifier',
  section: 'competitionEventKinds',
  shortName: 'RCQ',
}

describe('community referentials API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads every referential collection for a community member', async () => {
    const controller = new AbortController()
    const fetchMock = mockJsonResponse({
      referentials: {
        formats: [],
        games: [],
        series: [],
        tags: [],
      },
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await listCommunityReferentials(
      'community test',
      controller.signal,
    )

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/communities/community%20test/referentials'),
      expect.objectContaining({
        credentials: 'include',
        signal: controller.signal,
      }),
    )
    expect(result.referentials).toEqual({
      competitionEventKinds: [],
      competitionFormats: [],
      games: [],
      tags: [],
    })
  })

  it('maps the frontend series section to the backend endpoint', async () => {
    const fetchMock = mockJsonResponse({
      option: {
        id: 'series-rcq',
        isActive: true,
        name: seriesInput.name,
        shortName: seriesInput.shortName,
      },
    })
    vi.stubGlobal('fetch', fetchMock)

    await createCommunityReferential('community-crc-delorean', seriesInput)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/communities/community-crc-delorean/referentials/series',
      ),
      expect.objectContaining({
        body: JSON.stringify({
          name: seriesInput.name,
          shortName: seriesInput.shortName,
        }),
        credentials: 'include',
        method: 'POST',
      }),
    )
  })

  it('does not send a short name for tags', async () => {
    const fetchMock = mockJsonResponse({
      option: {
        color: '#315f73',
        communityId: 'community-crc-delorean',
        id: 'tag-pauper',
        isActive: true,
        kind: 'interest',
        name: 'Pauper',
      },
    })
    vi.stubGlobal('fetch', fetchMock)

    await createCommunityReferential('community-crc-delorean', {
      color: '#315f73',
      name: 'Pauper',
      section: 'tags',
      shortName: 'Must not be sent',
      tagKind: 'interest',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          name: 'Pauper',
          color: '#315f73',
          kind: 'interest',
        }),
      }),
    )
  })

  it('updates, reorders and deletes options through their dedicated routes', async () => {
    const fetchMock = mockJsonResponse({
      option: {
        id: 'series-rcq',
        isActive: false,
        name: seriesInput.name,
        shortName: seriesInput.shortName,
      },
    })
    vi.stubGlobal('fetch', fetchMock)

    await updateCommunityReferential(
      'community-crc-delorean',
      'series-rcq',
      seriesInput,
      false,
    )

    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining('/referentials/series/series-rcq'),
      expect.objectContaining({
        body: JSON.stringify({
          name: seriesInput.name,
          shortName: seriesInput.shortName,
          isActive: false,
        }),
        method: 'PATCH',
      }),
    )

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ optionIds: ['series-rcq'] })),
    )
    await reorderCommunityReferentials(
      'community-crc-delorean',
      'competitionEventKinds',
      ['series-rcq'],
    )
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining('/referentials/series/order'),
      expect.objectContaining({
        body: JSON.stringify({ optionIds: ['series-rcq'] }),
        method: 'PATCH',
      }),
    )

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    await deleteCommunityReferential(
      'community-crc-delorean',
      'competitionEventKinds',
      'series-rcq',
    )
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining('/referentials/series/series-rcq'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
