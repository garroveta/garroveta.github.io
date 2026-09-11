import { afterEach, describe, expect, it, vi } from 'vitest'

import { demoData } from '../data/demoData'
import {
  getCommunityBadgeSettings,
  saveCommunityBadgeSettings,
} from './communityBadgeSettings'

function mockJsonResponse(body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

describe('community badge settings API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads persisted badge settings for a member', async () => {
    const controller = new AbortController()
    const fetchMock = mockJsonResponse({
      badgeSettings: demoData.badgeSettings,
    })
    vi.stubGlobal('fetch', fetchMock)

    await getCommunityBadgeSettings(demoData.community.id, controller.signal)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/communities/community-crc-delorean/badge-settings',
      ),
      expect.objectContaining({
        credentials: 'include',
        signal: controller.signal,
      }),
    )
  })

  it('saves every rule through the manager endpoint', async () => {
    const fetchMock = mockJsonResponse({
      badgeSettings: demoData.badgeSettings,
    })
    vi.stubGlobal('fetch', fetchMock)

    await saveCommunityBadgeSettings(
      demoData.community.id,
      demoData.badgeSettings,
    )

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/communities/community-crc-delorean/badge-settings',
      ),
      expect.objectContaining({
        body: JSON.stringify(demoData.badgeSettings),
        credentials: 'include',
        method: 'PATCH',
      }),
    )
  })

  it('encodes the community identifier in the request path', async () => {
    const fetchMock = mockJsonResponse({
      badgeSettings: demoData.badgeSettings,
    })
    vi.stubGlobal('fetch', fetchMock)

    await getCommunityBadgeSettings('community test')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/communities/community%20test/badge-settings',
      ),
      expect.any(Object),
    )
  })
})
