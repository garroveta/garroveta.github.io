import { apiRequest } from './client'

export { sendSignInOtp, verifySignInOtp } from './authentication'

export type InvitationStatus =
  'active' | 'expired' | 'invalid' | 'revoked' | 'used'

export type InvitationValidation = {
  community?: {
    city?: string
    name?: string
  }
  expiresAt?: string
  status: InvitationStatus
}

export type RedeemInvitationInput = {
  displayName: string
  favoriteGameIds: string[]
  invite: string
  tagIds: string[]
}

export function validateInvitation(
  invite: string,
  signal?: AbortSignal,
): Promise<InvitationValidation> {
  return apiRequest<InvitationValidation>(
    `/api/invitations/validate?invite=${encodeURIComponent(invite)}`,
    { signal },
  )
}

export function redeemInvitation(input: RedeemInvitationInput) {
  return apiRequest<{
    membership: {
      communityId: string
      displayName: string
      id: string
      role: 'player'
      status: 'approved'
    }
    status: 'success'
  }>('/api/invitations/redeem', {
    body: JSON.stringify(input),
    method: 'POST',
  })
}
