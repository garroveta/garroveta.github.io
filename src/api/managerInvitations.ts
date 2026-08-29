import { apiRequest } from './client'

export type ManagerInvitationStatus = 'active' | 'expired' | 'revoked' | 'used'

export type ManagerInvitation = {
  communityId: string
  createdAt: string
  createdByMemberId: string
  expiresAt: string
  id: string
  label: string | null
  revokedAt: string | null
  status: ManagerInvitationStatus
  usedAt: string | null
}

export type CreatedManagerInvitation = ManagerInvitation & {
  inviteUrl: string
}

export type CreateManagerInvitationInput = {
  expiresInDays: number
  label: string | null
}

export function createCommunityInvitation(
  communityId: string,
  input: CreateManagerInvitationInput,
) {
  return apiRequest<{ invitation: CreatedManagerInvitation }>(
    `/api/communities/${encodeURIComponent(communityId)}/invitations`,
    {
      body: JSON.stringify(input),
      method: 'POST',
    },
  )
}

export function listCommunityInvitations(
  communityId: string,
  signal?: AbortSignal,
) {
  return apiRequest<{ invitations: ManagerInvitation[] }>(
    `/api/communities/${encodeURIComponent(communityId)}/invitations`,
    { signal },
  )
}
