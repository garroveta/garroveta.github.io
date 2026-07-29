import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import { getEventAgenda, getEventById } from './eventSelectors'

describe('event selectors', () => {
  it('orders upcoming events and keeps past events separate', () => {
    const agenda = getEventAgenda(demoData, demoData.currentMemberId)

    expect(agenda.upcoming.map(({ event }) => event.id)).toEqual([
      'event-fnm-pauper',
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

    expect(item?.tags.map(({ name }) => name)).toEqual(['Pauper'])
    expect(item?.registration?.status).toBe('waitlisted')
  })
})
