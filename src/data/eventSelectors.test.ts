import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import {
  filterEventAgenda,
  getEventAgenda,
  getEventById,
  getEventParticipants,
} from './eventSelectors'

describe('event selectors', () => {
  it('orders upcoming events and keeps past events separate', () => {
    const agenda = getEventAgenda(demoData, demoData.currentMemberId)

    expect(agenda.upcoming.map(({ event }) => event.id)).toEqual([
      'event-dragon-ball-store-championship',
      'event-gundam-store-championship-wednesday',
      'event-painting-table',
      'event-modern-tournament',
      'event-fnm-standard',
      'event-gundam-store-championship-friday',
      'event-one-piece-store-championship',
      'event-commander-night',
      'event-modern-league',
      'event-mtg-draft-express',
      'event-mtg-draft-night',
      'event-presentation-hobbit',
    ])
    expect(agenda.past.map(({ event }) => event.id)).toEqual([
      'event-store-championship',
    ])
  })

  it('adds tags and the active member registration to an event', () => {
    const item = getEventById(
      demoData,
      demoData.currentMemberId,
      'event-presentation-hobbit',
    )

    expect(item?.game?.shortName).toBe('MTG')
    expect(item?.tags.map(({ name }) => name)).toEqual(['Draft'])
    expect(item?.registration?.status).toBe('waitlisted')
  })

  it('keeps a hidden event editable without exposing it in the agenda', () => {
    const hiddenEvent = demoData.events.find(
      ({ listedInAgenda }) => listedInAgenda === false,
    )!
    const agenda = getEventAgenda(demoData, demoData.currentMemberId)

    expect(
      [...agenda.upcoming, ...agenda.past].some(
        ({ event }) => event.id === hiddenEvent.id,
      ),
    ).toBe(false)
    expect(
      getEventById(demoData, demoData.currentMemberId, hiddenEvent.id)?.event,
    ).toBe(hiddenEvent)
  })

  it('combines game and activity filters', () => {
    const agenda = getEventAgenda(demoData, demoData.currentMemberId)
    const filteredAgenda = filterEventAgenda(agenda, {
      gameId: 'game-mtg',
      type: 'tournament',
    })

    expect(filteredAgenda.upcoming.map(({ event }) => event.id)).toEqual([
      'event-modern-tournament',
      'event-fnm-standard',
    ])
    expect(filteredAgenda.past.map(({ event }) => event.id)).toEqual([
      'event-store-championship',
    ])
  })

  it('joins event registrations with members and orders the waitlist', () => {
    const participants = getEventParticipants(
      demoData,
      'event-mtg-draft-express',
    )

    expect(participants).toHaveLength(3)
    expect(participants.at(-1)).toMatchObject({
      member: { displayName: 'Álex Romero' },
      registration: { status: 'waitlisted' },
      waitlistPosition: 1,
    })
  })
})
