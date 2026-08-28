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

export function listCommunityInvitations(
  communityId: string,
  signal?: AbortSignal,
) {
  return apiRequest<{ invitations: ManagerInvitation[] }>(
    `/api/communities/${encodeURIComponent(communityId)}/invitations`,
    { signal },
  )
}
