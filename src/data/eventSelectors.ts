import type {
  CommunityEvent,
  CommunityGame,
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

  const items = data.events.flatMap((event) => {
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
  const agenda = getEventAgenda(data, memberId)

  return [...agenda.upcoming, ...agenda.past].find(
    ({ event }) => event.id === eventId,
  )
}
