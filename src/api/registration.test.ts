import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const authMocks = vi.hoisted(() => ({
  sendVerificationOtp: vi.fn(),
  signInEmailOtp: vi.fn(),
}))

vi.mock('../auth/client', () => ({
  authClient: {
    emailOtp: {
      sendVerificationOtp: authMocks.sendVerificationOtp,
    },
    signIn: {
      emailOtp: authMocks.signInEmailOtp,
    },
  },
}))

import {
  redeemInvitation,
  sendSignInOtp,
  validateInvitation,
  verifySignInOtp,
} from './registration'

describe('registration API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.sendVerificationOtp.mockResolvedValue({
      data: { success: true },
      error: null,
    })
    authMocks.signInEmailOtp.mockResolvedValue({
      data: { user: { id: 'existing-user' } },
      error: null,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses Better Auth to send and verify a sign-in OTP', async () => {
    await sendSignInOtp('member@example.com')
    await verifySignInOtp('member@example.com', '123456')

    expect(authMocks.sendVerificationOtp).toHaveBeenCalledWith({
      email: 'member@example.com',
      type: 'sign-in',
    })
    expect(authMocks.signInEmailOtp).toHaveBeenCalledWith({
      email: 'member@example.com',
      name: 'member',
      otp: '123456',
    })
  })

  it('validates an invitation without exposing it outside the API request', async () => {
    const invite = 'a'.repeat(43)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          community: { city: 'Inca', name: 'CRC Delorean' },
          expiresAt: '2026-09-27T12:00:00.000Z',
          status: 'active',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(validateInvitation(invite)).resolves.toMatchObject({
      status: 'active',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/invitations/validate?invite=${invite}`),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('redeems the invitation with the authenticated session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          membership: {
            communityId: 'community-crc-delorean',
            displayName: 'Marina Valverde',
            id: 'member-new',
            role: 'player',
            status: 'approved',
          },
          status: 'success',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await redeemInvitation({
      displayName: 'Marina Valverde',
      favoriteGameIds: ['game-mtg'],
      invite: 'a'.repeat(43),
      tagIds: ['tag-pauper'],
    })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/invitations/redeem'),
      expect.objectContaining({
        body: expect.stringContaining('Marina Valverde'),
        credentials: 'include',
        method: 'POST',
      }),
    )
  })
})
