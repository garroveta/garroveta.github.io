import type { DemoDataSet, EventRegistration, EventType } from '../domain/types'
import { DEMO_REFERENCE_TIME } from './dashboardSelectors'

export type CommunityEventInput = {
  createdByMemberId: string
  gameId: string
  formatId?: string
  competitionEventKindId?: string
  type: EventType
  title: string
  description: string
  startsAt: string
  endsAt: string
  registrationEnabled: boolean
  capacity: number
  tagIds: string[]
}

export type CommunityEventUpdateInput = CommunityEventInput & {
  eventId: string
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

function createEventId(data: DemoDataSet, title: string) {
  const baseId = `event-${slugify(title) || 'actividad'}`
  let candidateId = baseId
  let suffix = 2

  while (data.events.some(({ id }) => id === candidateId)) {
    candidateId = `${baseId}-${suffix}`
    suffix += 1
  }

  return candidateId
}

export function publishCommunityEvent(
  data: DemoDataSet,
  input: CommunityEventInput,
): DemoDataSet {
  const creator = data.members.find(({ id }) => id === input.createdByMemberId)
  const game = data.games.find(({ id }) => id === input.gameId)
  const format = input.formatId
    ? data.competitionFormats.find(({ id }) => id === input.formatId)
    : undefined
  const eventKind = input.competitionEventKindId
    ? data.competitionEventKinds.find(
        ({ id }) => id === input.competitionEventKindId,
      )
    : undefined
  const title = input.title.trim()
  const description = input.description.trim()
  const startsAt = new Date(input.startsAt)
  const endsAt = new Date(input.endsAt)
  const registrationEnabled =
    input.gameId === 'game-mtg' && input.registrationEnabled
  const capacity = registrationEnabled ? Math.floor(input.capacity) : 0

  if (
    !creator ||
    creator.role !== 'manager' ||
    !game ||
    (Boolean(input.formatId) && !format) ||
    (Boolean(format) && format?.gameId !== game.id) ||
    (Boolean(input.competitionEventKindId) && !eventKind) ||
    (game.id === 'game-mtg' && (format?.gameId !== game.id || !eventKind)) ||
    !title ||
    !description ||
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime()) ||
    endsAt <= startsAt ||
    (registrationEnabled && capacity < 1)
  ) {
    return data
  }

  const validTagIds = new Set(data.tags.map(({ id }) => id))
  const tagIds = [...new Set(input.tagIds)].filter((tagId) =>
    validTagIds.has(tagId),
  )

  return {
    ...data,
    events: [
      ...data.events,
      {
        id: createEventId(data, title),
        communityId: data.community.id,
        gameId: game.id,
        formatId: format?.id,
        competitionEventKindId: eventKind?.id,
        type: input.type,
        title,
        description,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        registrationEnabled,
        capacity,
        status: 'scheduled',
        tagIds,
        createdByMemberId: creator.id,
        registrationSummary: {
          confirmed: 0,
          waitlisted: 0,
        },
      },
    ],
  }
}

export function updateCommunityEvent(
  data: DemoDataSet,
  input: CommunityEventUpdateInput,
): DemoDataSet {
  const manager = data.members.find(
    ({ id, role }) => id === input.createdByMemberId && role === 'manager',
  )
  const event = data.events.find(({ id }) => id === input.eventId)
  const game = data.games.find(({ id }) => id === input.gameId)
  const format = input.formatId
    ? data.competitionFormats.find(({ id }) => id === input.formatId)
    : undefined
  const eventKind = input.competitionEventKindId
    ? data.competitionEventKinds.find(
        ({ id }) => id === input.competitionEventKindId,
      )
    : undefined
  const title = input.title.trim()
  const description = input.description.trim()
  const startsAt = new Date(input.startsAt)
  const endsAt = new Date(input.endsAt)
  const registrationEnabled =
    input.gameId === 'game-mtg' && input.registrationEnabled
  const capacity = registrationEnabled ? Math.floor(input.capacity) : 0
  const currentConfirmed = event?.registrationEnabled
    ? event.registrationSummary.confirmed
    : 0

  if (
    !manager ||
    !event ||
    !game ||
    (Boolean(input.formatId) && !format) ||
    (Boolean(format) && format?.gameId !== game.id) ||
    (Boolean(input.competitionEventKindId) && !eventKind) ||
    (game.id === 'game-mtg' && (format?.gameId !== game.id || !eventKind)) ||
    !title ||
    !description ||
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime()) ||
    endsAt <= startsAt ||
    (registrationEnabled && (capacity < 1 || capacity < currentConfirmed))
  ) {
    return data
  }

  const validTagIds = new Set(data.tags.map(({ id }) => id))
  const tagIds = [...new Set(input.tagIds)].filter((tagId) =>
    validTagIds.has(tagId),
  )
  const gameChanged = event.gameId !== game.id

  return {
    ...data,
    events: data.events.map((candidate) =>
      candidate.id === event.id
        ? {
            ...candidate,
            gameId: game.id,
            formatId:
              format?.id ?? (gameChanged ? undefined : candidate.formatId),
            competitionEventKindId:
              eventKind?.id ??
              (gameChanged ? undefined : candidate.competitionEventKindId),
            countsForCommunityRanking: gameChanged
              ? false
              : candidate.countsForCommunityRanking,
            type: input.type,
            title,
            description,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            registrationEnabled,
            capacity,
            status:
              candidate.status === 'completed'
                ? ('completed' as const)
                : registrationEnabled && currentConfirmed >= capacity
                  ? ('full' as const)
                  : ('scheduled' as const),
            tagIds,
            registrationSummary:
              registrationEnabled && candidate.registrationEnabled
                ? candidate.registrationSummary
                : { confirmed: 0, waitlisted: 0 },
          }
        : candidate,
    ),
    registrations: registrationEnabled
      ? data.registrations
      : data.registrations.filter(
          ({ eventId: registrationEventId }) =>
            registrationEventId !== event.id,
        ),
  }
}

export function deleteCommunityEvent(
  data: DemoDataSet,
  eventId: string,
  managerId: string,
): DemoDataSet {
  const manager = data.members.find(
    ({ id, role }) => id === managerId && role === 'manager',
  )

  if (!manager || !data.events.some(({ id }) => id === eventId)) {
    return data
  }

  return {
    ...data,
    events: data.events.filter(({ id }) => id !== eventId),
    registrations: data.registrations.filter(
      ({ eventId: registrationEventId }) => registrationEventId !== eventId,
    ),
    eventStandings: data.eventStandings.filter(
      ({ eventId: standingEventId }) => standingEventId !== eventId,
    ),
  }
}

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
    event.registrationEnabled !== true ||
    event.status === 'completed'
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

export function registerMemberForEventByManager(
  data: DemoDataSet,
  eventId: string,
  memberId: string,
  managerId: string,
  registeredAt = DEMO_REFERENCE_TIME,
): DemoDataSet {
  const manager = data.members.find(
    ({ id, role }) => id === managerId && role === 'manager',
  )
  const member = data.members.find(
    ({ id, status }) => id === memberId && status === 'approved',
  )

  if (!manager || !member) {
    return data
  }

  return registerForEvent(data, eventId, memberId, registeredAt)
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

  if (
    !registration ||
    !event ||
    event.registrationEnabled !== true ||
    event.status === 'completed'
  ) {
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

  if (
    !registration ||
    !event ||
    event.registrationEnabled !== true ||
    event.status === 'completed'
  ) {
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

export function setEventAttendance(
  data: DemoDataSet,
  eventId: string,
  memberId: string,
  attended: boolean,
): DemoDataSet {
  const registration = data.registrations.find(
    (candidate) =>
      candidate.eventId === eventId &&
      candidate.memberId === memberId &&
      (candidate.status === 'confirmed' || candidate.status === 'attended'),
  )
  const event = data.events.find(({ id }) => id === eventId)

  if (!registration || !event || event.registrationEnabled !== true) {
    return data
  }

  const nextStatus: EventRegistration['status'] = attended
    ? 'attended'
    : 'confirmed'

  if (registration.status === nextStatus) {
    return data
  }

  const attendedCount = Math.max(
    0,
    (event.registrationSummary.attended ?? 0) + (attended ? 1 : -1),
  )

  return {
    ...data,
    events: data.events.map((candidate) =>
      candidate.id === eventId
        ? {
            ...candidate,
            registrationSummary: {
              ...candidate.registrationSummary,
              attended: attendedCount,
            },
          }
        : candidate,
    ),
    registrations: data.registrations.map((candidate) =>
      candidate.id === registration.id
        ? { ...candidate, status: nextStatus }
        : candidate,
    ),
  }
}

export function removeEventParticipant(
  data: DemoDataSet,
  eventId: string,
  memberId: string,
): DemoDataSet {
  const registration = data.registrations.find(
    (candidate) =>
      candidate.eventId === eventId &&
      candidate.memberId === memberId &&
      candidate.status !== 'cancelled',
  )
  const event = data.events.find(({ id }) => id === eventId)

  if (
    !registration ||
    !event ||
    event.registrationEnabled !== true ||
    event.status === 'completed'
  ) {
    return data
  }

  if (registration.status === 'waitlisted') {
    return leaveEventWaitlist(data, eventId, memberId)
  }

  const nextWaitlistedRegistration = data.registrations
    .filter(
      (candidate) =>
        candidate.eventId === eventId && candidate.status === 'waitlisted',
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
  const attended = Math.max(
    0,
    (event.registrationSummary.attended ?? 0) -
      (registration.status === 'attended' ? 1 : 0),
  )

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
              attended,
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
