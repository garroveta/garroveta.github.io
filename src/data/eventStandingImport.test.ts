import { describe, expect, it } from 'vitest'

import type { ParsedEventLinkStanding } from './eventLinkImport'
import {
  matchEventLinkMembers,
  normalizeEventLinkPlayerName,
  saveEventLinkStanding,
} from './eventStandingImport'
import { demoData } from './demoData'

const parsedStanding: ParsedEventLinkStanding = {
  eventTitle: 'Pauper de prueba',
  storeId: '18452',
  externalEventId: '11620006',
  roundNumber: 5,
  completed: true,
  warnings: [],
  rows: [
    {
      rank: 1,
      displayName: 'Sergio Gil',
      eventPoints: 15,
      wins: 5,
      losses: 0,
      draws: 0,
      opponentMatchWinPercentage: 72,
      gameWinPercentage: 81.8,
      opponentGameWinPercentage: 63.2,
    },
    {
      rank: 2,
      displayName: 'Invitado Nuevo',
      eventPoints: 12,
      wins: 4,
      losses: 1,
      draws: 0,
      opponentMatchWinPercentage: 60.7,
      gameWinPercentage: 75,
      opponentGameWinPercentage: 55.5,
    },
  ],
}

describe('EventLink member matching', () => {
  it('normalizes accents, symbols, casing and extra spaces', () => {
    expect(normalizeEventLinkPlayerName('  José Thomas 🔴⚪ ')).toBe(
      'jose thomas',
    )
  })

  it('suggests exact approved members and leaves guests unlinked', () => {
    const matches = matchEventLinkMembers(parsedStanding.rows, demoData.members)

    expect(matches[0]).toMatchObject({
      status: 'matched',
      memberId: 'member-sergio',
    })
    expect(matches[1]).toMatchObject({
      status: 'unmatched',
      memberId: undefined,
    })
  })

  it('does not choose automatically between duplicate names', () => {
    const sergio = demoData.members.find(({ id }) => id === 'member-sergio')!
    const matches = matchEventLinkMembers(parsedStanding.rows, [
      ...demoData.members,
      { ...sergio, id: 'member-sergio-duplicate' },
    ])

    expect(matches[0]).toMatchObject({
      status: 'ambiguous',
      memberId: undefined,
      suggestedMemberIds: ['member-sergio', 'member-sergio-duplicate'],
    })
  })
})

describe('EventLink standing mutations', () => {
  it('lets the manager save imported results and their provenance', () => {
    const updated = saveEventLinkStanding(demoData, {
      eventId: 'event-presentation-hobbit',
      managerId: 'member-lucia',
      parsedStanding,
      memberIdsByRow: ['member-sergio', undefined],
      countsForCommunityRanking: true,
      importedAt: '2026-08-22T10:00:00+02:00',
    })

    expect(
      updated.events.find(({ id }) => id === 'event-presentation-hobbit'),
    ).toMatchObject({
      status: 'completed',
      countsForCommunityRanking: true,
      registrationSummary: { attended: 2 },
    })
    expect(
      updated.eventStandings.find(
        ({ eventId }) => eventId === 'event-presentation-hobbit',
      ),
    ).toMatchObject({
      entries: [
        { displayName: 'Sergio Gil', memberId: 'member-sergio' },
        { displayName: 'Invitado Nuevo', memberId: undefined },
      ],
      source: {
        kind: 'eventlink_html',
        storeId: '18452',
        externalEventId: '11620006',
        roundNumber: 5,
        importedAt: '2026-08-22T10:00:00+02:00',
      },
    })
  })

  it('replaces an existing standing instead of appending a duplicate', () => {
    const eventId = 'event-result-win-a-box-pauper-2026-08-02'
    const previousCount = demoData.eventStandings.length
    const previousStanding = demoData.eventStandings.find(
      (standing) => standing.eventId === eventId,
    )!
    const updated = saveEventLinkStanding(demoData, {
      eventId,
      managerId: 'member-lucia',
      parsedStanding,
      memberIdsByRow: ['member-sergio', undefined],
      countsForCommunityRanking: true,
    })

    expect(updated.eventStandings).toHaveLength(previousCount)
    expect(
      updated.eventStandings.find((standing) => standing.eventId === eventId),
    ).toMatchObject({
      id: previousStanding.id,
      entries: [{ displayName: 'Sergio Gil' }, { displayName: 'Invitado Nuevo' }],
    })
  })

  it('rejects unauthorized managers and duplicate member assignments', () => {
    const baseInput = {
      eventId: 'event-presentation-hobbit',
      parsedStanding,
      countsForCommunityRanking: true,
    }

    expect(
      saveEventLinkStanding(demoData, {
        ...baseInput,
        managerId: 'member-alex',
        memberIdsByRow: ['member-sergio', undefined],
      }),
    ).toBe(demoData)
    expect(
      saveEventLinkStanding(demoData, {
        ...baseInput,
        managerId: 'member-lucia',
        memberIdsByRow: ['member-sergio', 'member-sergio'],
      }),
    ).toBe(demoData)
  })
})
