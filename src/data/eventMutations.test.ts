import { describe, expect, it } from 'vitest'

import {
  cancelEventRegistration,
  leaveEventWaitlist,
  registerForEvent,
} from './eventMutations'
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

  it('adds a player to the waitlist when an event is full', () => {
    const updatedData = registerForEvent(
      demoData,
      'event-fnm-pauper',
      'member-nora',
    )
    const event = updatedData.events.find(({ id }) => id === 'event-fnm-pauper')

    expect(event?.registrationSummary).toMatchObject({
      confirmed: 24,
      waitlisted: 4,
    })
    expect(
      updatedData.registrations.find(
        ({ eventId, memberId }) =>
          eventId === 'event-fnm-pauper' && memberId === 'member-nora',
      )?.status,
    ).toBe('waitlisted')
  })

  it('lets a player leave the waitlist', () => {
    const updatedData = leaveEventWaitlist(
      demoData,
      'event-fnm-pauper',
      demoData.currentMemberId,
    )

    expect(
      updatedData.events.find(({ id }) => id === 'event-fnm-pauper')
        ?.registrationSummary.waitlisted,
    ).toBe(2)
    expect(
      updatedData.registrations.find(
        ({ id }) => id === 'registration-alex-pauper',
      )?.status,
    ).toBe('cancelled')
  })

  it('promotes the first waiting player when a place is released', () => {
    const dataWithConfirmedPlayer = structuredClone(demoData)
    dataWithConfirmedPlayer.registrations.push({
      id: 'registration-marta-pauper',
      eventId: 'event-fnm-pauper',
      memberId: 'member-marta',
      status: 'confirmed',
      registeredAt: '2026-07-20T10:00:00+02:00',
    })

    const updatedData = cancelEventRegistration(
      dataWithConfirmedPlayer,
      'event-fnm-pauper',
      'member-marta',
    )

    expect(
      updatedData.events.find(({ id }) => id === 'event-fnm-pauper')
        ?.registrationSummary,
    ).toMatchObject({ confirmed: 24, waitlisted: 2 })
    expect(
      updatedData.registrations.find(
        ({ id }) => id === 'registration-alex-pauper',
      )?.status,
    ).toBe('confirmed')
  })
})
