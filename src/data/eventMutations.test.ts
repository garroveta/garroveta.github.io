import { describe, expect, it } from 'vitest'

import type { DemoDataSet } from '../domain/types'
import {
  cancelEventRegistration,
  deleteCommunityEvent,
  leaveEventWaitlist,
  publishCommunityEvent,
  registerForEvent,
  registerMemberForEventByManager,
  removeEventParticipant,
  setEventAttendance,
  updateCommunityEvent,
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
      registrationEnabled: true,
      capacity: 20,
      tagIds: ['tag-principiantes', 'unknown-tag'],
    })

    expect(updatedData.events.at(-1)).toMatchObject({
      id: 'event-torneo-de-prueba',
      gameId: 'game-one-piece',
      title: 'Torneo de prueba',
      description: 'Evento para probar el formulario.',
      registrationEnabled: false,
      capacity: 0,
      tagIds: ['tag-principiantes'],
      createdByMemberId: 'member-lucia',
      registrationSummary: { confirmed: 0, waitlisted: 0 },
    })
    expect(updatedData.events).toHaveLength(originalEventCount + 1)
    expect(demoData.events).toHaveLength(originalEventCount)
  })

  it('does not offer deactivated options to new events', () => {
    const data: DemoDataSet = structuredClone(demoData)
    const game = data.games.find(({ id }) => id === 'game-one-piece')!
    game.isActive = false

    expect(
      publishCommunityEvent(data, {
        createdByMemberId: 'member-lucia',
        gameId: game.id,
        type: 'tournament',
        title: 'Evento con juego retirado',
        description: 'No debe publicarse.',
        startsAt: '2026-08-15T17:00:00+02:00',
        endsAt: '2026-08-15T21:00:00+02:00',
        registrationEnabled: false,
        capacity: 0,
        tagIds: [],
      }),
    ).toBe(data)

    game.isActive = true
    data.tags.find(({ id }) => id === 'tag-principiantes')!.isActive = false
    const published = publishCommunityEvent(data, {
      createdByMemberId: 'member-lucia',
      gameId: game.id,
      type: 'tournament',
      title: 'Evento sin etiqueta retirada',
      description: 'La etiqueta no debe volver a utilizarse.',
      startsAt: '2026-08-15T17:00:00+02:00',
      endsAt: '2026-08-15T21:00:00+02:00',
      registrationEnabled: false,
      capacity: 0,
      tagIds: ['tag-principiantes'],
    })

    expect(published.events.at(-1)?.tagIds).toEqual([])
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
        registrationEnabled: false,
        capacity: 8,
        tagIds: [],
      }),
    ).toBe(demoData)
  })

  it('lets the manager update an event without going below confirmed places', () => {
    const updatedData = updateCommunityEvent(demoData, {
      eventId: 'event-presentation-hobbit',
      createdByMemberId: 'member-lucia',
      gameId: 'game-mtg',
      formatId: 'format-mtg-sealed',
      competitionEventKindId: 'event-kind-prerelease',
      type: 'launch',
      title: 'Presentación: The Hobbit actualizada',
      description: 'Nueva información para la comunidad.',
      startsAt: '2026-08-08T18:00:00+02:00',
      endsAt: '2026-08-08T22:00:00+02:00',
      registrationEnabled: true,
      capacity: 32,
      tagIds: ['tag-draft'],
    })

    expect(
      updatedData.events.find(({ id }) => id === 'event-presentation-hobbit'),
    ).toMatchObject({
      title: 'Presentación: The Hobbit actualizada',
      capacity: 32,
      startsAt: '2026-08-08T18:00:00+02:00',
    })

    expect(
      updateCommunityEvent(demoData, {
        eventId: 'event-presentation-hobbit',
        createdByMemberId: 'member-lucia',
        gameId: 'game-mtg',
        formatId: 'format-mtg-sealed',
        competitionEventKindId: 'event-kind-prerelease',
        type: 'launch',
        title: 'Capacidad incorrecta',
        description: 'No debe aplicarse.',
        startsAt: '2026-08-08T18:00:00+02:00',
        endsAt: '2026-08-08T22:00:00+02:00',
        registrationEnabled: true,
        capacity: 7,
        tagIds: [],
      }),
    ).toBe(demoData)
  })

  it('lets the manager delete an event and its linked data', () => {
    const updatedData = deleteCommunityEvent(
      demoData,
      'event-presentation-hobbit',
      'member-lucia',
    )

    expect(
      updatedData.events.some(({ id }) => id === 'event-presentation-hobbit'),
    ).toBe(false)
    expect(
      updatedData.registrations.some(
        ({ eventId }) => eventId === 'event-presentation-hobbit',
      ),
    ).toBe(false)
  })

  it('lets the manager add an approved member to an event', () => {
    const updatedData = registerMemberForEventByManager(
      demoData,
      'event-mtg-draft-night',
      'member-biel',
      'member-lucia',
    )

    expect(
      updatedData.registrations.find(
        ({ eventId, memberId }) =>
          eventId === 'event-mtg-draft-night' && memberId === 'member-biel',
      )?.status,
    ).toBe('confirmed')
  })

  it('confirms a registration when a place is available', () => {
    const updatedData = registerForEvent(
      demoData,
      'event-mtg-draft-night',
      demoData.currentMemberId,
    )
    const event = updatedData.events.find(
      ({ id }) => id === 'event-mtg-draft-night',
    )

    expect(event?.registrationSummary.confirmed).toBe(7)
    expect(
      updatedData.registrations.find(
        ({ eventId, memberId }) =>
          eventId === 'event-mtg-draft-night' &&
          memberId === demoData.currentMemberId,
      )?.status,
    ).toBe('confirmed')
    expect(
      demoData.events.find(({ id }) => id === event?.id)?.registrationSummary
        .confirmed,
    ).toBe(6)
  })

  it('cancels a confirmed registration and releases the place', () => {
    const updatedData = cancelEventRegistration(
      demoData,
      'event-presentation-hobbit',
      'member-nora',
    )
    const event = updatedData.events.find(
      ({ id }) => id === 'event-presentation-hobbit',
    )

    expect(event?.registrationSummary.confirmed).toBe(30)
    expect(
      updatedData.registrations.find(
        ({ id }) => id === 'registration-nora-hobbit',
      )?.status,
    ).toBe('cancelled')
  })

  it('adds a player to the waitlist when an event is full', () => {
    const updatedData = registerForEvent(
      demoData,
      'event-presentation-hobbit',
      'member-biel',
    )
    const event = updatedData.events.find(
      ({ id }) => id === 'event-presentation-hobbit',
    )

    expect(event?.registrationSummary).toMatchObject({
      confirmed: 30,
      waitlisted: 4,
    })
    expect(
      updatedData.registrations.find(
        ({ eventId, memberId }) =>
          eventId === 'event-presentation-hobbit' && memberId === 'member-biel',
      )?.status,
    ).toBe('waitlisted')
  })

  it('lets a player leave the waitlist', () => {
    const updatedData = leaveEventWaitlist(
      demoData,
      'event-presentation-hobbit',
      demoData.currentMemberId,
    )

    expect(
      updatedData.events.find(({ id }) => id === 'event-presentation-hobbit')
        ?.registrationSummary.waitlisted,
    ).toBe(2)
    expect(
      updatedData.registrations.find(
        ({ id }) => id === 'registration-alex-hobbit',
      )?.status,
    ).toBe('cancelled')
  })

  it('promotes the first waiting player when a place is released', () => {
    const dataWithConfirmedPlayer = structuredClone(demoData)
    dataWithConfirmedPlayer.registrations.push({
      id: 'registration-biel-hobbit',
      eventId: 'event-presentation-hobbit',
      memberId: 'member-biel',
      status: 'confirmed',
      registeredAt: '2026-07-20T10:00:00+02:00',
    })

    const updatedData = cancelEventRegistration(
      dataWithConfirmedPlayer,
      'event-presentation-hobbit',
      'member-biel',
    )

    expect(
      updatedData.events.find(({ id }) => id === 'event-presentation-hobbit')
        ?.registrationSummary,
    ).toMatchObject({ confirmed: 30, waitlisted: 2 })
    expect(
      updatedData.registrations.find(
        ({ id }) => id === 'registration-sergio-hobbit',
      )?.status,
    ).toBe('confirmed')
  })

  it('records and clears a participant attendance', () => {
    const attendedData = setEventAttendance(
      demoData,
      'event-mtg-draft-express',
      'member-sergio',
      true,
    )

    expect(
      attendedData.registrations.find(
        ({ id }) => id === 'registration-sergio-draft-express',
      )?.status,
    ).toBe('attended')
    expect(
      attendedData.events.find(({ id }) => id === 'event-mtg-draft-express')
        ?.registrationSummary.attended,
    ).toBe(1)

    const correctedData = setEventAttendance(
      attendedData,
      'event-mtg-draft-express',
      'member-sergio',
      false,
    )

    expect(
      correctedData.registrations.find(
        ({ id }) => id === 'registration-sergio-draft-express',
      )?.status,
    ).toBe('confirmed')
  })

  it('lets the manager remove a participant and promote the waitlist', () => {
    const dataWithConfirmedPlayer = structuredClone(demoData)
    dataWithConfirmedPlayer.registrations.push({
      id: 'registration-biel-draft-express',
      eventId: 'event-mtg-draft-express',
      memberId: 'member-biel',
      status: 'confirmed',
      registeredAt: '2026-07-20T10:00:00+02:00',
    })

    const updatedData = removeEventParticipant(
      dataWithConfirmedPlayer,
      'event-mtg-draft-express',
      'member-biel',
    )

    expect(
      updatedData.registrations.find(
        ({ id }) => id === 'registration-biel-draft-express',
      )?.status,
    ).toBe('cancelled')
    expect(
      updatedData.registrations.find(
        ({ id }) => id === 'registration-alex-draft-express',
      )?.status,
    ).toBe('confirmed')
    expect(
      updatedData.events.find(({ id }) => id === 'event-mtg-draft-express')
        ?.registrationSummary,
    ).toMatchObject({ confirmed: 4, waitlisted: 0 })
  })

  it('does not register players when registrations are disabled', () => {
    expect(
      registerForEvent(demoData, 'event-fnm-standard', 'member-biel'),
    ).toBe(demoData)
  })
})
