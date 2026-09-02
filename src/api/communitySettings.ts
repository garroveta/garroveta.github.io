import type { CommunitySettingsInput } from '../data/communitySettings'
import { apiRequest } from './client'

export type PersistedCommunitySettings = CommunitySettingsInput & {
  id: string
}

function communitySettingsPath(communityId: string) {
  return `/api/communities/${encodeURIComponent(communityId)}/settings`
}

export function getCommunitySettings(
  communityId: string,
  signal?: AbortSignal,
) {
  return apiRequest<{ community: PersistedCommunitySettings }>(
    communitySettingsPath(communityId),
    { signal },
  )
}

export function saveCommunitySettings(
  communityId: string,
  input: CommunitySettingsInput,
) {
  return apiRequest<{ community: PersistedCommunitySettings }>(
    communitySettingsPath(communityId),
    {
      body: JSON.stringify(input),
      method: 'PATCH',
    },
  )
}
