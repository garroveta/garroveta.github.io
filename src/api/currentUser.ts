import type { CommunityRole, ContactMethod } from '../domain/types'
import { apiRequest } from './client'

export type CurrentMembership = {
  community: {
    city: string
    id: string
    name: string
    slug: string
  }
  contactMethods: ContactMethod[]
  displayName: string
  favoriteGameIds: string[]
  id: string
  joinedAt: string
  role: CommunityRole
  status: 'approved' | 'pending' | 'suspended'
  tagIds: string[]
}

export type CurrentUser = {
  memberships: CurrentMembership[]
  user: {
    email: string
    id: string
    name: string
  }
}

export type UpdateCurrentMembershipInput = {
  communityId: string
  contactMethods: ContactMethod[]
  displayName: string
  favoriteGameIds: string[]
  tagIds: string[]
}

export type UpdatedCurrentMembership = Pick<
  CurrentMembership,
  'contactMethods' | 'displayName' | 'favoriteGameIds' | 'id' | 'tagIds'
> & {
  communityId: string
}

export function getCurrentUser(signal?: AbortSignal) {
  return apiRequest<CurrentUser>('/api/me', { signal })
}

export function updateCurrentMembership(input: UpdateCurrentMembershipInput) {
  return apiRequest<{ membership: UpdatedCurrentMembership }>('/api/me', {
    body: JSON.stringify(input),
    method: 'PATCH',
  })
}
