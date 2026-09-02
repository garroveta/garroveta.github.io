import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  authorizeApprovedManager,
  authorizeApprovedMember,
  type ManagerAuthorizationResult,
  type MemberAuthorizationResult,
} from './authorization'
import { type AuthEnv } from './auth'
import {
  handleCommunitySettingsApiRequest,
  matchCommunitySettingsRoute,
} from './community-settings'

vi.mock('./authorization', () => ({
  authorizeApprovedManager: vi.fn(),
  authorizeApprovedMember: vi.fn(),
}))

const route = { communityId: 'community-crc-delorean' }
const openingHours = [
  { day: 'monday' },
  { day: 'tuesday' },
  { day: 'wednesday', opensAt: '17:00', closesAt: '24:00' },
  { day: 'thursday', opensAt: '17:00', closesAt: '24:00' },
  {
    day: 'friday',
    opensAt: '17:00',
    closesAt: '01:00',
    closesNextDay: true,
  },
  {
    day: 'saturday',
    opensAt: '09:00',
    closesAt: '01:00',
    closesNextDay: true,
  },
  { day: 'sunday', opensAt: '09:00', closesAt: '23:00' },
]
const persistedSettings = {
  address: 'Carrer Major, 12',
  city: 'Inca',
  contact_email: 'hola@delorean.example',
  contact_phone: '+34 971 00 00 00',
  facebook_url: null,
  id: 'community-crc-delorean',
  instagram_url: 'https://instagram.com/delorean',
  logo_url: null,
  name: 'CRC Delorean',
  opening_hours: JSON.stringify(openingHours),
  website_url: 'https://delorean.example',
}
const settingsInput = {
  address: 'Carrer Major, 12',
  city: 'Inca',
  contactEmail: 'hola@delorean.example',
  contactPhone: '+34 971 00 00 00',
  facebookUrl: '',
  instagramUrl: 'https://instagram.com/delorean',
  logoUrl: '',
  name: 'CRC Delorean',
  openingHours,
  websiteUrl: 'https://delorean.example',
}

function memberAuthorization(): MemberAuthorizationResult {
  return {
    authorized: true,
    value: {
      membership: {
        communityId: 'community-crc-delorean',
        displayName: 'Aina Mir',
        id: 'member-player',
        role: 'player',
        status: 'approved',
        userId: 'user-player',
      },
      user: {
        email: 'player@example.com',
        id: 'user-player',
        name: 'Aina Mir',
      },
    },
  }
}

function managerAuthorization(): ManagerAuthorizationResult {
  return {
    authorized: true,
    value: {
      membership: {
        communityId: 'community-crc-delorean',
        displayName: 'Tomás',
        id: 'member-manager',
        role: 'manager',
        status: 'approved',
        userId: 'user-manager',
      },
      user: {
        email: 'manager@example.com',
        id: 'user-manager',
        name: 'Tomás',
      },
    },
  }
}

function createContext({
  body,
  firstResult = persistedSettings,
  method = 'GET',
}: {
  body?: unknown
  firstResult?: unknown
  method?: string
} = {}) {
  const first = vi.fn().mockResolvedValue(firstResult)
  const bind = vi.fn()
  const prepare = vi.fn()
  const statement = { bind, first }
  bind.mockReturnValue(statement)
  prepare.mockReturnValue(statement)
  const init: RequestInit = { method }

  if (body !== undefined) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }

  return {
    bind,
    context: {
      context: {} as ExecutionContext,
      env: { DB: { prepare } as unknown as D1Database } as AuthEnv,
      request: new Request(
        'https://api.garroveta.es/api/communities/community-crc-delorean/settings',
        init,
      ),
    },
    prepare,
  }
}

describe('Community settings route', () => {
  it('matches only a settings endpoint with a safe community identifier', () => {
    expect(
      matchCommunitySettingsRoute(
        '/api/communities/community-crc-delorean/settings',
      ),
    ).toEqual(route)
    expect(
      matchCommunitySettingsRoute(
        '/api/communities/community%2Fother/settings',
      ),
    ).toBeNull()
  })
})

describe('Community settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authorizeApprovedMember).mockResolvedValue(memberAuthorization())
    vi.mocked(authorizeApprovedManager).mockResolvedValue(
      managerAuthorization(),
    )
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
  })

  it('returns persisted settings to an approved community member', async () => {
    const { bind, context } = createContext()

    const response = await handleCommunitySettingsApiRequest(context, route)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      community: {
        address: 'Carrer Major, 12',
        city: 'Inca',
        contactEmail: 'hola@delorean.example',
        contactPhone: '+34 971 00 00 00',
        facebookUrl: undefined,
        id: 'community-crc-delorean',
        instagramUrl: 'https://instagram.com/delorean',
        logoUrl: undefined,
        name: 'CRC Delorean',
        openingHours,
        websiteUrl: 'https://delorean.example',
      },
    })
    expect(bind).toHaveBeenCalledWith('community-crc-delorean')
    expect(authorizeApprovedMember).toHaveBeenCalledOnce()
  })

  it('updates every general setting for an approved manager', async () => {
    const { bind, context } = createContext({
      body: settingsInput,
      method: 'PATCH',
    })

    const response = await handleCommunitySettingsApiRequest(context, route)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      community: {
        city: 'Inca',
        name: 'CRC Delorean',
        openingHours,
      },
    })
    expect(bind).toHaveBeenCalledWith(
      'CRC Delorean',
      'Inca',
      'Carrer Major, 12',
      'hola@delorean.example',
      '+34 971 00 00 00',
      'https://delorean.example',
      'https://instagram.com/delorean',
      null,
      null,
      JSON.stringify(openingHours),
      expect.any(String),
      'community-crc-delorean',
    )
    expect(authorizeApprovedManager).toHaveBeenCalledOnce()
  })

  it('rejects malformed opening hours without writing to D1', async () => {
    const { context, prepare } = createContext({
      body: { ...settingsInput, openingHours: openingHours.slice(0, 6) },
      method: 'PATCH',
    })

    const response = await handleCommunitySettingsApiRequest(context, route)

    expect(response.status).toBe(400)
    expect(prepare).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'community_settings_invalid' },
    })
  })

  it('checks manager access before parsing a settings update', async () => {
    vi.mocked(authorizeApprovedManager).mockResolvedValue({
      authorized: false,
      response: Response.json(
        { error: { code: 'manager_access_required' } },
        { status: 403 },
      ),
    })
    const { context, prepare } = createContext({
      body: settingsInput,
      method: 'PATCH',
    })

    const response = await handleCommunitySettingsApiRequest(context, route)

    expect(response.status).toBe(403)
    expect(prepare).not.toHaveBeenCalled()
  })
})
