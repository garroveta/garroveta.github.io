import type { DemoDataSet } from '../domain/types'
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

  if (
    !event ||
    event.status === 'completed' ||
    event.registrationSummary.confirmed >= event.capacity
  ) {
    return data
  }

  const existingRegistration = data.registrations.find(
    (registration) =>
      registration.eventId === eventId && registration.memberId === memberId,
  )

  if (existingRegistration && existingRegistration.status !== 'cancelled') {
    return data
  }

  const confirmed = event.registrationSummary.confirmed + 1
  const registrations = existingRegistration
    ? data.registrations.map((registration) =>
        registration.id === existingRegistration.id
          ? {
              ...registration,
              status: 'confirmed' as const,
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
          status: 'confirmed' as const,
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

  return {
    ...data,
    events: data.events.map((candidate) =>
      candidate.id === eventId
        ? {
            ...candidate,
            status: 'scheduled' as const,
            registrationSummary: {
              ...candidate.registrationSummary,
              confirmed: Math.max(
                0,
                candidate.registrationSummary.confirmed - 1,
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
