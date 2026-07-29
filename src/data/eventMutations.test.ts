import { describe, expect, it } from 'vitest'

import { cancelEventRegistration, registerForEvent } from './eventMutations'
import { demoData } from './demoData'

describe('event registration mutations', () => {
  it('confirms a registration when a place is available', () => {
    const updatedData = registerForEvent(
      demoData,
      'event-modern-league',
      demoData.currentMemberId,
    )
    const event = updatedData.events.find(
      ({ id }) => id === 'event-modern-league',
    )

    expect(event?.registrationSummary.confirmed).toBe(15)
    expect(
      updatedData.registrations.find(
        ({ eventId, memberId }) =>
          eventId === 'event-modern-league' &&
          memberId === demoData.currentMemberId,
      )?.status,
    ).toBe('confirmed')
    expect(
      demoData.events.find(({ id }) => id === event?.id)?.registrationSummary
        .confirmed,
    ).toBe(14)
  })

  it('cancels a confirmed registration and releases the place', () => {
    const updatedData = cancelEventRegistration(
      demoData,
      'event-commander-night',
      demoData.currentMemberId,
    )
    const event = updatedData.events.find(
      ({ id }) => id === 'event-commander-night',
    )

    expect(event?.registrationSummary.confirmed).toBe(26)
    expect(
      updatedData.registrations.find(
        ({ id }) => id === 'registration-alex-commander',
      )?.status,
    ).toBe('cancelled')
  })

  it('does not register a player when an event is full', () => {
    expect(registerForEvent(demoData, 'event-fnm-pauper', 'member-nora')).toBe(
      demoData,
    )
  })
})
