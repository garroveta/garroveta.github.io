import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import { getEventAgenda, getEventById } from './eventSelectors'

describe('event selectors', () => {
  it('orders upcoming events and keeps past events separate', () => {
    const agenda = getEventAgenda(demoData, demoData.currentMemberId)

    expect(agenda.upcoming.map(({ event }) => event.id)).toEqual([
      'event-dragon-ball-store-championship',
      'event-gundam-store-championship-wednesday',
      'event-painting-table',
      'event-modern-tournament',
      'event-fnm-pauper',
      'event-gundam-store-championship-friday',
      'event-one-piece-store-championship',
      'event-marvel-draft-night',
      'event-commander-night',
      'event-modern-league',
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
      'event-fnm-pauper',
    )

    expect(item?.game?.shortName).toBe('MTG')
    expect(item?.tags.map(({ name }) => name)).toEqual(['Pauper'])
    expect(item?.registration?.status).toBe('waitlisted')
  })
})
