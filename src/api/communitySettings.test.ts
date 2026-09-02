import { afterEach, describe, expect, it, vi } from 'vitest'

import { demoData } from '../data/demoData'
import {
  getCommunitySettings,
  saveCommunitySettings,
} from './communitySettings'

const settingsInput = {
  name: demoData.community.name,
  city: demoData.community.city,
  contactEmail: demoData.community.contactEmail,
  openingHours: demoData.community.openingHours,
}

function mockJsonResponse(body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

describe('community settings API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads the persisted community settings for a member', async () => {
    const controller = new AbortController()
    const fetchMock = mockJsonResponse({
      community: { id: demoData.community.id, ...settingsInput },
    })
    vi.stubGlobal('fetch', fetchMock)

    await getCommunitySettings(demoData.community.id, controller.signal)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/communities/community-crc-delorean/settings',
      ),
      expect.objectContaining({
        credentials: 'include',
        signal: controller.signal,
      }),
    )
  })

  it('saves every setting through the manager endpoint', async () => {
    const fetchMock = mockJsonResponse({
      community: { id: demoData.community.id, ...settingsInput },
    })
    vi.stubGlobal('fetch', fetchMock)

    await saveCommunitySettings(demoData.community.id, settingsInput)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/communities/community-crc-delorean/settings',
      ),
      expect.objectContaining({
        body: JSON.stringify(settingsInput),
        credentials: 'include',
        method: 'PATCH',
      }),
    )
  })

  it('encodes the community identifier in the request path', async () => {
    const fetchMock = mockJsonResponse({
      community: { id: 'community test', ...settingsInput },
    })
    vi.stubGlobal('fetch', fetchMock)

    await getCommunitySettings('community test')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/communities/community%20test/settings'),
      expect.any(Object),
    )
  })
})
