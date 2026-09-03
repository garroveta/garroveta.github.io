import { describe, expect, it } from 'vitest'

import type { ParsedEventLinkStanding } from './eventLinkImport'
import {
  matchEventLinkMembers,
  normalizeEventLinkPlayerName,
} from './eventStandingImport'
import { demoData } from './demoData'

const parsedStanding: ParsedEventLinkStanding = {
  eventTitle: 'Standard de prueba',
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

  it('links the realistic EventLink player names added to the community', () => {
    const matches = matchEventLinkMembers(
      [
        { ...parsedStanding.rows[0], displayName: 'Pep Peralta Isern' },
        { ...parsedStanding.rows[1], displayName: 'José Thomas 🔴⚪' },
      ],
      demoData.members,
    )

    expect(matches).toEqual([
      expect.objectContaining({
        status: 'matched',
        memberId: 'member-eventlink-01',
      }),
      expect.objectContaining({
        status: 'matched',
        memberId: 'member-eventlink-18',
      }),
    ])
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
