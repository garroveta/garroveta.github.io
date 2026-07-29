import type { DemoDataSet, EventRegistration } from '../domain/types'
import { DEMO_REFERENCE_TIME } from './dashboardSelectors'

function registrationId(memberId: string, eventId: string) {
  return `registration-${memberId}-${eventId}`
}

export function registerForEvent(
  data: DemoDataSet,
  eventId: string,
  memberId: string,
  registeredAt = DEMO_REFERENCE_TIME,
): DemoDataSet {
  const event = data.events.find(({ id }) => id === eventId)

  if (!event || event.status === 'completed') {
    return data
  }

  const existingRegistration = data.registrations.find(
    (registration) =>
      registration.eventId === eventId && registration.memberId === memberId,
  )

  if (existingRegistration && existingRegistration.status !== 'cancelled') {
    return data
  }

  const hasAvailablePlace = event.registrationSummary.confirmed < event.capacity
  const registrationStatus: EventRegistration['status'] = hasAvailablePlace
    ? 'confirmed'
    : 'waitlisted'
  const confirmed =
    event.registrationSummary.confirmed + (hasAvailablePlace ? 1 : 0)
  const waitlisted =
    event.registrationSummary.waitlisted + (hasAvailablePlace ? 0 : 1)
  const registrations = existingRegistration
    ? data.registrations.map((registration) =>
        registration.id === existingRegistration.id
          ? {
              ...registration,
              status: registrationStatus,
              registeredAt,
            }
          : registration,
      )
    : [
        ...data.registrations,
        {
          id: registrationId(memberId, eventId),
          eventId,
          memberId,
          status: registrationStatus,
          registeredAt,
        },
      ]

  return {
    ...data,
    events: data.events.map((candidate) =>
      candidate.id === eventId
        ? {
            ...candidate,
            status:
              confirmed === candidate.capacity
                ? ('full' as const)
                : ('scheduled' as const),
            registrationSummary: {
              ...candidate.registrationSummary,
              confirmed,
              waitlisted,
            },
          }
        : candidate,
    ),
    registrations,
  }
}

export function cancelEventRegistration(
  data: DemoDataSet,
  eventId: string,
  memberId: string,
): DemoDataSet {
  const registration = data.registrations.find(
    (candidate) =>
      candidate.eventId === eventId &&
      candidate.memberId === memberId &&
      candidate.status === 'confirmed',
  )
  const event = data.events.find(({ id }) => id === eventId)

  if (!registration || !event || event.status === 'completed') {
    return data
  }

  const nextWaitlistedRegistration = data.registrations
    .filter(
      (candidate) =>
        candidate.eventId === eventId &&
        candidate.status === 'waitlisted' &&
        candidate.id !== registration.id,
    )
    .sort(
      (first, second) =>
        new Date(first.registeredAt).getTime() -
        new Date(second.registeredAt).getTime(),
    )[0]
  const confirmed = nextWaitlistedRegistration
    ? event.registrationSummary.confirmed
    : Math.max(0, event.registrationSummary.confirmed - 1)
  const waitlisted = nextWaitlistedRegistration
    ? Math.max(0, event.registrationSummary.waitlisted - 1)
    : event.registrationSummary.waitlisted

  return {
    ...data,
    events: data.events.map((candidate) =>
      candidate.id === eventId
        ? {
            ...candidate,
            status:
              confirmed === candidate.capacity
                ? ('full' as const)
                : ('scheduled' as const),
            registrationSummary: {
              ...candidate.registrationSummary,
              confirmed,
              waitlisted,
            },
          }
        : candidate,
    ),
    registrations: data.registrations.map((candidate) =>
      candidate.id === registration.id
        ? { ...candidate, status: 'cancelled' as const }
        : candidate.id === nextWaitlistedRegistration?.id
          ? { ...candidate, status: 'confirmed' as const }
          : candidate,
    ),
  }
}

export function leaveEventWaitlist(
  data: DemoDataSet,
  eventId: string,
  memberId: string,
): DemoDataSet {
  const registration = data.registrations.find(
    (candidate) =>
      candidate.eventId === eventId &&
      candidate.memberId === memberId &&
      candidate.status === 'waitlisted',
  )
  const event = data.events.find(({ id }) => id === eventId)

  if (!registration || !event || event.status === 'completed') {
    return data
  }

  return {
    ...data,
    events: data.events.map((candidate) =>
      candidate.id === eventId
        ? {
            ...candidate,
            registrationSummary: {
              ...candidate.registrationSummary,
              waitlisted: Math.max(
                0,
                candidate.registrationSummary.waitlisted - 1,
              ),
            },
          }
        : candidate,
    ),
    registrations: data.registrations.map((candidate) =>
      candidate.id === registration.id
        ? { ...candidate, status: 'cancelled' as const }
        : candidate,
    ),
  }
}
