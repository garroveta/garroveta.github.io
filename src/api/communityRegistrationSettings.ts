import type { CommunityRegistrationSettings } from '../domain/types'
import { apiRequest } from './client'

function registrationSettingsPath(communityId: string) {
  return `/api/communities/${encodeURIComponent(communityId)}/registration-settings`
}

export function getCommunityRegistrationSettings(
  communityId: string,
  signal?: AbortSignal,
) {
  return apiRequest<{ registrationSettings: CommunityRegistrationSettings }>(
    registrationSettingsPath(communityId),
    { signal },
  )
}

export function saveCommunityRegistrationSettings(
  communityId: string,
  input: CommunityRegistrationSettings,
) {
  return apiRequest<{ registrationSettings: CommunityRegistrationSettings }>(
    registrationSettingsPath(communityId),
    {
      body: JSON.stringify(input),
      method: 'PATCH',
    },
  )
}
