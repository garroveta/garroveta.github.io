import { describe, expect, it } from 'vitest'

import {
  cancelEventRegistration,
  leaveEventWaitlist,
  publishCommunityEvent,
  registerForEvent,
  removeEventParticipant,
  setEventAttendance,
} from './eventMutations'
import { demoData } from './demoData'

describe('event registration mutations', () => {
  it('lets the manager publish a multi-game event', () => {
    const originalEventCount = demoData.events.length
    const updatedData = publishCommunityEvent(demoData, {
      createdByMemberId: 'member-lucia',
      gameId: 'game-one-piece',
      type: 'tournament',
      title: '  Torneo de prueba  ',
      description: '  Evento para probar el formulario.  ',
      startsAt: '2026-08-15T17:00:00+02:00',
      endsAt: '2026-08-15T21:00:00+02:00',
      capacity: 20,
      tagIds: ['tag-principiantes', 'unknown-tag'],
    })

    expect(updatedData.events.at(-1)).toMatchObject({
      id: 'event-torneo-de-prueba',
      gameId: 'game-one-piece',
      title: 'Torneo de prueba',
      description: 'Evento para probar el formulario.',
      capacity: 20,
      tagIds: ['tag-principiantes'],
      createdByMemberId: 'member-lucia',
      registrationSummary: { confirmed: 0, waitlisted: 0 },
    })
    expect(updatedData.events).toHaveLength(originalEventCount + 1)
    expect(demoData.events).toHaveLength(originalEventCount)
  })

  it('rejects event publication from a player', () => {
    expect(
      publishCommunityEvent(demoData, {
        createdByMemberId: demoData.currentMemberId,
        gameId: 'game-mtg',
        type: 'casual',
        title: 'Evento no autorizado',
        description: 'No debe publicarse.',
        startsAt: '2026-08-15T17:00:00+02:00',
        endsAt: '2026-08-15T20:00:00+02:00',
        capacity: 8,
        tagIds: [],
      }),
    ).toBe(demoData)
  })

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

  it('records and clears a participant attendance', () => {
    const attendedData = setEventAttendance(
      demoData,
      'event-commander-night',
      demoData.currentMemberId,
      true,
    )

    expect(
      attendedData.registrations.find(
        ({ id }) => id === 'registration-alex-commander',
      )?.status,
    ).toBe('attended')
    expect(
      attendedData.events.find(({ id }) => id === 'event-commander-night')
        ?.registrationSummary.attended,
    ).toBe(1)

    const correctedData = setEventAttendance(
      attendedData,
      'event-commander-night',
      demoData.currentMemberId,
      false,
    )

    expect(
      correctedData.registrations.find(
        ({ id }) => id === 'registration-alex-commander',
      )?.status,
    ).toBe('confirmed')
  })

  it('lets the manager remove a participant and promote the waitlist', () => {
    const dataWithConfirmedPlayer = structuredClone(demoData)
    dataWithConfirmedPlayer.registrations.push({
      id: 'registration-marta-pauper',
      eventId: 'event-fnm-pauper',
      memberId: 'member-marta',
      status: 'confirmed',
      registeredAt: '2026-07-20T10:00:00+02:00',
    })

    const updatedData = removeEventParticipant(
      dataWithConfirmedPlayer,
      'event-fnm-pauper',
      'member-marta',
    )

    expect(
      updatedData.registrations.find(
        ({ id }) => id === 'registration-marta-pauper',
      )?.status,
    ).toBe('cancelled')
    expect(
      updatedData.registrations.find(
        ({ id }) => id === 'registration-alex-pauper',
      )?.status,
    ).toBe('confirmed')
    expect(
      updatedData.events.find(({ id }) => id === 'event-fnm-pauper')
        ?.registrationSummary,
    ).toMatchObject({ confirmed: 24, waitlisted: 2 })
  })
})
