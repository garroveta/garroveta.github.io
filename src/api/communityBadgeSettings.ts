import type { CommunityBadgeSettings } from '../domain/types'
import { apiRequest } from './client'

function badgeSettingsPath(communityId: string) {
  return `/api/communities/${encodeURIComponent(communityId)}/badge-settings`
}

export function getCommunityBadgeSettings(
  communityId: string,
  signal?: AbortSignal,
) {
  return apiRequest<{ badgeSettings: CommunityBadgeSettings }>(
    badgeSettingsPath(communityId),
    { signal },
  )
}

export function saveCommunityBadgeSettings(
  communityId: string,
  input: CommunityBadgeSettings,
) {
  return apiRequest<{ badgeSettings: CommunityBadgeSettings }>(
    badgeSettingsPath(communityId),
    {
      body: JSON.stringify(input),
      method: 'PATCH',
    },
  )
}
