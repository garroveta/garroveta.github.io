import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import {
  SEASON_BADGES,
  getMemberSeasonBadges,
  getSeasonBadgeBoard,
} from './rankingBadges'
import type { DemoDataSet } from '../domain/types'

const activeScope = { gameId: 'game-mtg', seasonId: 'ranking-season-2026' }
const closedScope = { gameId: 'game-mtg', seasonId: 'ranking-season-2025' }

function memberBadge(
  memberId: string,
  badgeId: string,
  scope = activeScope,
  data: DemoDataSet = demoData,
) {
  return getMemberSeasonBadges(data, memberId, scope)!.find(
    ({ definition }) => definition.id === badgeId,
  )!
}

function holdersOf(
  badgeId: string,
  scope = activeScope,
  data: DemoDataSet = demoData,
) {
  return getSeasonBadgeBoard(data, scope)!.badges.find(
    ({ definition }) => definition.id === badgeId,
  )!.holders
}

describe('rankingBadges', () => {
  it('defines every badge as a counter threshold or as a final place', () => {
    const ids = SEASON_BADGES.map(({ id }) => id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(
      SEASON_BADGES.every(({ counter, target, finalRank }) =>
        finalRank === undefined
          ? counter !== undefined && target !== undefined && target > 0
          : counter === undefined && target === undefined,
      ),
    ).toBe(true)
  })

  it('dates a badge from the result that unlocked it', () => {
    expect(memberBadge('member-carla', 'debut').unlockedAt).toBe(
      '2026-05-29T21:00:00+02:00',
    )
    expect(memberBadge('member-carla', 'habitual').unlockedAt).toBe(
      '2026-07-24T21:00:00+02:00',
    )
    expect(memberBadge('member-carla', 'primer-titulo').unlockedAt).toBe(
      '2026-06-26T21:00:00+02:00',
    )
  })

  it('keeps showing how far a locked badge is, capped at its target', () => {
    expect(memberBadge('member-carla', 'de-la-casa')).toMatchObject({
      unlockedAt: undefined,
      progress: { current: 7, target: 12 },
    })
    expect(memberBadge('member-carla', 'pilar-de-la-temporada')).toMatchObject({
      unlockedAt: undefined,
      progress: { current: 7, target: 20 },
    })
    expect(memberBadge('member-carla', 'debut').progress).toEqual({
      current: 1,
      target: 1,
    })
  })

  it('counts distinct formats across the whole game', () => {
    expect(memberBadge('member-carla', 'dos-formatos')).toMatchObject({
      unlockedAt: '2026-07-25T19:00:00+02:00',
      progress: { current: 2, target: 2 },
    })
    expect(memberBadge('member-carla', 'todoterreno').progress).toEqual({
      current: 2,
      target: 3,
    })
  })

  it('needs three wins before calling a run clean', () => {
    const standing = demoData.eventStandings.find(
      ({ id }) => id === 'standing-fnm-standard-2025-11-28',
    )!

    expect(standing.entries.slice(0, 3)).toMatchObject([
      { memberId: 'member-biel', wins: 3, losses: 0 },
      { memberId: 'member-sergio', wins: 2, losses: 0 },
      { memberId: 'member-carla', wins: 2, losses: 0 },
    ])
    expect(
      holdersOf('impecable', closedScope).map(({ member }) => member.id),
    ).toEqual(['member-biel'])
  })

  it('awards the season badges only once the season is closed', () => {
    const season = demoData.rankingSeasons.find(
      ({ id }) => id === closedScope.seasonId,
    )!

    expect(holdersOf('campeon-de-la-temporada')).toEqual([])
    expect(
      memberBadge('member-carla', 'campeon-de-la-temporada'),
    ).toMatchObject({ unlockedAt: undefined, progress: undefined })

    expect(
      holdersOf('campeon-de-la-temporada', closedScope).map(
        ({ member, unlockedAt }) => [member.id, unlockedAt],
      ),
    ).toEqual([['member-biel', season.endsOn]])
    expect(
      holdersOf('podio-de-la-temporada', closedScope).map(
        ({ member }) => member.id,
      ),
    ).toEqual(['member-biel', 'member-carla', 'member-sergio'])
  })

  it('lists the holders from the first to unlock the badge', () => {
    const holders = holdersOf('primer-titulo')

    expect(holders.slice(0, 3).map(({ member }) => member.id)).toEqual([
      'member-sergio',
      'member-carla',
      'member-biel',
    ])
    expect(
      holders.every(
        (holder, index) =>
          index === 0 ||
          new Date(holders[index - 1].unlockedAt).getTime() <=
            new Date(holder.unlockedAt).getTime(),
      ),
    ).toBe(true)
  })

  it('counts the rarity denominator from the members who actually played', () => {
    expect(getSeasonBadgeBoard(demoData, activeScope)!.players).toBe(15)
    expect(getSeasonBadgeBoard(demoData, closedScope)!.players).toBe(14)
    expect(holdersOf('debut').length).toBe(15)
  })

  it('ignores a member the closed season never included', () => {
    const data = structuredClone(demoData) as DemoDataSet
    const lateMember = data.members.find(
      ({ id }) => id === 'member-lucas-pending',
    )!
    lateMember.status = 'approved'
    const closedStanding = data.eventStandings.find(
      ({ id }) => id === 'standing-fnm-standard-2025-11-28',
    )!
    closedStanding.entries[0].memberId = lateMember.id

    expect(
      holdersOf('debut', closedScope, data).some(
        ({ member }) => member.id === lateMember.id,
      ),
    ).toBe(false)
    expect(
      memberBadge(lateMember.id, 'debut', closedScope, data).unlockedAt,
    ).toBeUndefined()
  })

  it('returns nothing for an unknown season', () => {
    const unknownScope = { gameId: 'game-mtg', seasonId: 'ranking-season-x' }

    expect(getSeasonBadgeBoard(demoData, unknownScope)).toBeUndefined()
    expect(
      getMemberSeasonBadges(demoData, 'member-carla', unknownScope),
    ).toBeUndefined()
  })
})
