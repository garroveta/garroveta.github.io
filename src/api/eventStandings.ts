import type { EventStanding, EventStandingEntry } from '../domain/types'
import { apiRequest } from './client'

export type EventStandingWriteInput = {
  countsForCommunityRanking: boolean
  entries: EventStandingEntry[]
  source: {
    externalEventId?: string
    roundNumber?: number
    storeId?: string
  }
}

function eventStandingCollectionPath(communityId: string) {
  return `/api/communities/${encodeURIComponent(communityId)}/event-standings`
}

function eventStandingPath(communityId: string, eventId: string) {
  return `${eventStandingCollectionPath(communityId)}/${encodeURIComponent(eventId)}`
}

export function listCommunityEventStandings(
  communityId: string,
  signal?: AbortSignal,
) {
  return apiRequest<{ standings: EventStanding[] }>(
    eventStandingCollectionPath(communityId),
    { signal },
  )
}

export function saveCommunityEventStanding(
  communityId: string,
  eventId: string,
  input: EventStandingWriteInput,
) {
  return apiRequest<{ standing: EventStanding }>(
    eventStandingPath(communityId, eventId),
    {
      body: JSON.stringify(input),
      method: 'PUT',
    },
  )
}
