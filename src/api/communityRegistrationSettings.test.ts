import { afterEach, describe, expect, it, vi } from 'vitest'

import { demoData } from '../data/demoData'
import {
  getCommunityRegistrationSettings,
  saveCommunityRegistrationSettings,
} from './communityRegistrationSettings'

function mockJsonResponse(body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

describe('community registration settings API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads persisted registration settings for a member', async () => {
    const controller = new AbortController()
    const fetchMock = mockJsonResponse({
      registrationSettings: demoData.registrationSettings,
    })
    vi.stubGlobal('fetch', fetchMock)

    await getCommunityRegistrationSettings(
      demoData.community.id,
      controller.signal,
    )

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/communities/community-crc-delorean/registration-settings',
      ),
      expect.objectContaining({
        credentials: 'include',
        signal: controller.signal,
      }),
    )
  })

  it('saves every rule through the manager endpoint', async () => {
    const fetchMock = mockJsonResponse({
      registrationSettings: demoData.registrationSettings,
    })
    vi.stubGlobal('fetch', fetchMock)

    await saveCommunityRegistrationSettings(
      demoData.community.id,
      demoData.registrationSettings,
    )

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/communities/community-crc-delorean/registration-settings',
      ),
      expect.objectContaining({
        body: JSON.stringify(demoData.registrationSettings),
        credentials: 'include',
        method: 'PATCH',
      }),
    )
  })

  it('encodes the community identifier in the request path', async () => {
    const fetchMock = mockJsonResponse({
      registrationSettings: demoData.registrationSettings,
    })
    vi.stubGlobal('fetch', fetchMock)

    await getCommunityRegistrationSettings('community test')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/communities/community%20test/registration-settings',
      ),
      expect.any(Object),
    )
  })
})
