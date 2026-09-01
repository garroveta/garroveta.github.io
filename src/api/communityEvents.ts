import { apiRequest } from './client'
import type { CommunityEventInput } from '../data/eventMutations'
import type {
  CommunityEvent,
  EventRegistration,
  EventRegistrationSummary,
} from '../domain/types'

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

function eventRegistrationPath(communityId: string, eventId: string) {
  return `${eventPath(communityId, eventId)}/registrations`
}

export type ManagedEventRegistration = EventRegistration & {
  displayName: string
  initials: string
  status: 'confirmed' | 'waitlisted'
  waitlistPosition?: number
}

export type EventRegistrationMutation = {
  registrationSummary: EventRegistrationSummary
}

export function listCommunityEvents(communityId: string, signal?: AbortSignal) {
  return apiRequest<{
    events: CommunityEvent[]
    registrations: EventRegistration[]
  }>(eventCollectionPath(communityId), { signal })
}

export function registerForPersistedEvent(
  communityId: string,
  eventId: string,
) {
  return apiRequest<
    EventRegistrationMutation & { registration: EventRegistration }
  >(eventRegistrationPath(communityId, eventId), { method: 'POST' })
}

export function cancelPersistedEventRegistration(
  communityId: string,
  eventId: string,
) {
  return apiRequest<EventRegistrationMutation & { cancelledMemberId: string }>(
    `${eventRegistrationPath(communityId, eventId)}/me`,
    {
      method: 'DELETE',
    },
  )
}

export function listPersistedEventRegistrations(
  communityId: string,
  eventId: string,
) {
  return apiRequest<{ registrations: ManagedEventRegistration[] }>(
    eventRegistrationPath(communityId, eventId),
  )
}

export function removePersistedEventRegistration(
  communityId: string,
  eventId: string,
  memberId: string,
) {
  return apiRequest<EventRegistrationMutation & { cancelledMemberId: string }>(
    `${eventRegistrationPath(communityId, eventId)}/${encodeURIComponent(memberId)}`,
    { method: 'DELETE' },
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
