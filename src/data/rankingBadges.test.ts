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

  it('never unlocks a badge on a single appearance', () => {
    expect(
      SEASON_BADGES.every(({ target }) => target === undefined || target >= 2),
    ).toBe(true)
  })

  it('dates a badge from the result that unlocked it', () => {
    expect(memberBadge('member-sergio', '4x4').unlockedAt).toBe(
      '2026-07-17T21:00:00+02:00',
    )
    expect(memberBadge('member-sergio', 'vigilance').unlockedAt).toBe(
      '2026-07-24T21:00:00+02:00',
    )
  })

  it('keeps showing how far a locked badge is, capped at its target', () => {
    expect(memberBadge('member-carla', 'persist')).toMatchObject({
      unlockedAt: undefined,
      progress: { current: 7, target: 15 },
    })
    expect(memberBadge('member-carla', 'undying')).toMatchObject({
      unlockedAt: undefined,
      progress: { current: 7, target: 30 },
    })
    expect(memberBadge('member-sergio', '4x4').progress).toEqual({
      current: 4,
      target: 4,
    })
  })

  it('counts distinct formats, not distinct events', () => {
    expect(
      getMemberSeasonBadges(demoData, 'member-carla', activeScope)!.find(
        ({ definition }) => definition.id === 'vigilance',
      )!.progress,
    ).toEqual({ current: 6, target: 6 })
    expect(memberBadge('member-carla', 'delirium').progress).toEqual({
      current: 2,
      target: 4,
    })
  })

  it('counts a Top 4 finish, not only a podium', () => {
    const fourth = demoData.eventStandings
      .find(({ id }) => id === 'standing-fnm-standard-2026-07-17')!
      .entries.find(({ rank }) => rank === 4)!

    expect(fourth.memberId).toBe('member-carla')
    expect(memberBadge('member-carla', '4x4')).toMatchObject({
      unlockedAt: '2026-07-17T21:00:00+02:00',
      progress: { current: 4, target: 4 },
    })
  })

  it('needs three wins before counting a run as clean', () => {
    const standing = demoData.eventStandings.find(
      ({ id }) => id === 'standing-fnm-standard-2025-11-28',
    )!

    expect(standing.entries.slice(0, 3)).toMatchObject([
      { memberId: 'member-biel', wins: 3, losses: 0 },
      { memberId: 'member-sergio', wins: 2, losses: 0 },
      { memberId: 'member-carla', wins: 2, losses: 0 },
    ])
    expect(
      ['member-biel', 'member-sergio', 'member-carla'].map(
        (memberId) =>
          memberBadge(memberId, 'hexproof', closedScope).progress?.current,
      ),
    ).toEqual([1, 0, 0])
  })

  it('awards the season badges only once the season is closed', () => {
    const season = demoData.rankingSeasons.find(
      ({ id }) => id === closedScope.seasonId,
    )!

    expect(holdersOf('monarch')).toEqual([])
    expect(memberBadge('member-carla', 'monarch')).toMatchObject({
      unlockedAt: undefined,
      progress: undefined,
    })

    expect(
      holdersOf('monarch', closedScope).map(({ member, unlockedAt }) => [
        member.id,
        unlockedAt,
      ]),
    ).toEqual([['member-biel', season.endsOn]])
    expect(
      holdersOf('council', closedScope).map(({ member }) => member.id),
    ).toEqual(['member-biel', 'member-carla', 'member-sergio'])
  })

  it('lists the holders from the first to unlock the badge', () => {
    const holders = holdersOf('4x4')

    expect(holders).toHaveLength(4)
    expect(holders[0].member.id).toBe('member-biel')
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
      holdersOf('monarch', closedScope, data).some(
        ({ member }) => member.id === lateMember.id,
      ),
    ).toBe(false)
    expect(
      memberBadge(lateMember.id, 'vigilance', closedScope, data).progress,
    ).toEqual({ current: 0, target: 6 })
  })

  it('follows a winning streak only across events won whole', () => {
    const data = structuredClone(demoData) as DemoDataSet
    const setRecord = (
      standingId: string,
      record: { wins: number; losses: number; draws: number },
    ) => {
      const entry = data.eventStandings
        .find(({ id }) => id === standingId)!
        .entries.find(({ memberId }) => memberId === 'member-carla')

      if (entry) {
        Object.assign(entry, record)
      }
    }
    const broken = { wins: 1, losses: 1, draws: 0 }
    const swept = { wins: 3, losses: 0, draws: 0 }

    for (const { id } of data.eventStandings) {
      setRecord(id, broken)
    }
    setRecord('standing-store-championship-modern-2026-07-25', swept)
    setRecord('standing-win-a-box-standard-2026-08-02', swept)

    expect(
      memberBadge('member-carla', 'storm', activeScope, data).progress,
    ).toEqual({ current: 6, target: 10 })

    setRecord('standing-store-championship-modern-2026-07-25', {
      wins: 3,
      losses: 0,
      draws: 1,
    })

    expect(
      memberBadge('member-carla', 'storm', activeScope, data).progress,
    ).toEqual({ current: 3, target: 10 })
  })

  it('returns nothing for an unknown season', () => {
    const unknownScope = { gameId: 'game-mtg', seasonId: 'ranking-season-x' }

    expect(getSeasonBadgeBoard(demoData, unknownScope)).toBeUndefined()
    expect(
      getMemberSeasonBadges(demoData, 'member-carla', unknownScope),
    ).toBeUndefined()
  })
})
