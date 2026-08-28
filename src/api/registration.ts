import { authClient } from '../auth/client'
import { apiRequest, ClientApiError } from './client'

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

type AuthClientError = {
  code?: string
  error?: { code?: string; message?: string }
  message?: string
  status: number
  statusText?: string
}

function toAuthError(error: AuthClientError) {
  return new ClientApiError(
    error.status,
    error.code ?? error.error?.code ?? 'authentication_failed',
    error.message ??
      error.error?.message ??
      error.statusText ??
      'No se ha podido completar la autenticación.',
  )
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

export async function sendSignInOtp(email: string) {
  const { error } = await authClient.emailOtp.sendVerificationOtp({
    email,
    type: 'sign-in',
  })

  if (error) {
    throw toAuthError(error)
  }
}

export async function verifySignInOtp(email: string, otp: string) {
  const fallbackName = email.split('@')[0]?.trim() || 'Miembro'
  const { data, error } = await authClient.signIn.emailOtp({
    email,
    name: fallbackName,
    otp,
  })

  if (error) {
    throw toAuthError(error)
  }

  if (!data?.user) {
    throw new ClientApiError(
      401,
      'authentication_failed',
      'No se ha podido abrir la sesión.',
    )
  }

  return data
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
