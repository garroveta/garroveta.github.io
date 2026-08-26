import type {
  CommunityEvent,
  CommunityGame,
  CommunityMember,
  CommunityTag,
  DemoDataSet,
  EventType,
  EventRegistration,
} from '../domain/types'
import { DEMO_REFERENCE_TIME } from './dashboardSelectors'

export type EventListItem = {
  event: CommunityEvent
  game?: CommunityGame
  tags: CommunityTag[]
  registration?: EventRegistration
}

export type EventAgenda = {
  upcoming: EventListItem[]
  past: EventListItem[]
}

export type EventAgendaFilters = {
  gameId?: string
  type?: EventType
}

export type EventParticipant = {
  registration: EventRegistration
  member: CommunityMember
  waitlistPosition?: number
}

function byStartTime(first: EventListItem, second: EventListItem) {
  return (
    new Date(first.event.startsAt).getTime() -
    new Date(second.event.startsAt).getTime()
  )
}

export function getEventAgenda(
  data: DemoDataSet,
  memberId: string,
  referenceTime = DEMO_REFERENCE_TIME,
): EventAgenda {
  const referenceTimestamp = new Date(referenceTime).getTime()
  const gamesById = new Map(data.games.map((game) => [game.id, game]))
  const tagsById = new Map(data.tags.map((tag) => [tag.id, tag]))
  const registrationsByEventId = new Map(
    data.registrations
      .filter(
        (registration) =>
          registration.memberId === memberId &&
          registration.status !== 'cancelled',
      )
      .map((registration) => [registration.eventId, registration]),
  )

  const items = data.events
    .filter(({ listedInAgenda }) => listedInAgenda !== false)
    .flatMap((event) => {
      return [
        {
          event,
          game: event.gameId ? gamesById.get(event.gameId) : undefined,
          tags: event.tagIds.flatMap((tagId) => {
            const tag = tagsById.get(tagId)
            return tag ? [tag] : []
          }),
          registration: registrationsByEventId.get(event.id),
        },
      ]
    })

  return {
    upcoming: items
      .filter(
        ({ event }) =>
          event.status !== 'completed' &&
          new Date(event.startsAt).getTime() >= referenceTimestamp,
      )
      .sort(byStartTime),
    past: items
      .filter(
        ({ event }) =>
          event.status === 'completed' ||
          new Date(event.startsAt).getTime() < referenceTimestamp,
      )
      .sort((first, second) => byStartTime(second, first)),
  }
}

export function filterEventAgenda(
  agenda: EventAgenda,
  filters: EventAgendaFilters,
): EventAgenda {
  const matches = ({ event }: EventListItem) =>
    (!filters.gameId || event.gameId === filters.gameId) &&
    (!filters.type || event.type === filters.type)

  return {
    upcoming: agenda.upcoming.filter(matches),
    past: agenda.past.filter(matches),
  }
}

export function getEventById(
  data: DemoDataSet,
  memberId: string,
  eventId: string,
): EventListItem | undefined {
  const event = data.events.find(({ id }) => id === eventId)

  if (!event) {
    return undefined
  }

  return {
    event,
    game: event.gameId
      ? data.games.find(({ id }) => id === event.gameId)
      : undefined,
    tags: event.tagIds.flatMap((tagId) => {
      const tag = data.tags.find(({ id }) => id === tagId)
      return tag ? [tag] : []
    }),
    registration: data.registrations.find(
      (registration) =>
        registration.eventId === eventId &&
        registration.memberId === memberId &&
        registration.status !== 'cancelled',
    ),
  }
}

export function getEventParticipants(
  data: DemoDataSet,
  eventId: string,
): EventParticipant[] {
  const membersById = new Map(data.members.map((member) => [member.id, member]))
  const registrations = data.registrations
    .filter(
      (registration) =>
        registration.eventId === eventId && registration.status !== 'cancelled',
    )
    .sort((first, second) => {
      const statusOrder = {
        attended: 0,
        confirmed: 1,
        waitlisted: 2,
        cancelled: 3,
      }

      return (
        statusOrder[first.status] - statusOrder[second.status] ||
        new Date(first.registeredAt).getTime() -
          new Date(second.registeredAt).getTime()
      )
    })
  let waitlistPosition = 0

  return registrations.flatMap((registration) => {
    const member = membersById.get(registration.memberId)

    if (!member) {
      return []
    }

    if (registration.status === 'waitlisted') {
      waitlistPosition += 1
    }

    return [
      {
        registration,
        member,
        waitlistPosition:
          registration.status === 'waitlisted' ? waitlistPosition : undefined,
      },
    ]
  })
}
