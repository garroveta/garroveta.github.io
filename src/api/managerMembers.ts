import type { CommunityRole } from '../domain/types'
import { apiRequest } from './client'

export type ManagedCommunityMember = {
  displayName: string
  email: string
  favoriteGameIds: string[]
  id: string
  joinedAt: string
  role: CommunityRole
  status: 'approved' | 'pending' | 'suspended'
  tagIds: string[]
}

export type ManagedCommunityMembers = {
  currentMemberId: string
  members: ManagedCommunityMember[]
}

export type UpdateCommunityMemberInput = {
  role?: CommunityRole
  status?: 'approved' | 'suspended'
  tagIds?: string[]
}

export function listCommunityMembers(
  communityId: string,
  signal?: AbortSignal,
) {
  return apiRequest<ManagedCommunityMembers>(
    `/api/communities/${encodeURIComponent(communityId)}/members`,
    { signal },
  )
}

export function updateCommunityMember(
  communityId: string,
  memberId: string,
  input: UpdateCommunityMemberInput,
) {
  return apiRequest<{ member: ManagedCommunityMember }>(
    `/api/communities/${encodeURIComponent(communityId)}/members/${encodeURIComponent(memberId)}`,
    {
      body: JSON.stringify(input),
      method: 'PATCH',
    },
  )
}
