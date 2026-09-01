import { apiRequest } from './client'
import type { CommunityEventInput } from '../data/eventMutations'
import type { CommunityEvent } from '../domain/types'

export type CommunityEventWriteInput = Omit<
  CommunityEventInput,
  'createdByMemberId'
>

function eventCollectionPath(communityId: string) {
  return `/api/communities/${encodeURIComponent(communityId)}/events`
}

function eventPath(communityId: string, eventId: string) {
  return `${eventCollectionPath(communityId)}/${encodeURIComponent(eventId)}`
}

export function listCommunityEvents(communityId: string, signal?: AbortSignal) {
  return apiRequest<{ events: CommunityEvent[] }>(
    eventCollectionPath(communityId),
    { signal },
  )
}

export function createCommunityEvent(
  communityId: string,
  input: CommunityEventWriteInput,
) {
  return apiRequest<{ event: CommunityEvent }>(
    eventCollectionPath(communityId),
    {
      body: JSON.stringify(input),
      method: 'POST',
    },
  )
}

export function updatePersistedCommunityEvent(
  communityId: string,
  eventId: string,
  input: CommunityEventWriteInput,
) {
  return apiRequest<{ event: CommunityEvent }>(
    eventPath(communityId, eventId),
    {
      body: JSON.stringify(input),
      method: 'PATCH',
    },
  )
}

export function deletePersistedCommunityEvent(
  communityId: string,
  eventId: string,
) {
  return apiRequest<{ deletedEventId: string }>(
    eventPath(communityId, eventId),
    { method: 'DELETE' },
  )
}
