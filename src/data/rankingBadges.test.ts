import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import { SEASON_BADGES } from '../domain/badges'
import { getMemberSeasonBadges, getSeasonBadgeBoard } from './rankingBadges'
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

  it('never rewards simply turning up', () => {
    const attendanceBadges = SEASON_BADGES.filter(
      ({ counter }) => counter === 'played',
    )

    expect(attendanceBadges.length).toBeGreaterThan(0)
    expect(attendanceBadges.every(({ target }) => (target ?? 0) >= 5)).toBe(
      true,
    )
  })

  it('dates a badge from the result that unlocked it', () => {
    expect(memberBadge('member-sergio', 'ferocious').unlockedAt).toBe(
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
    expect(memberBadge('member-carla', 'saga')).toMatchObject({
      unlockedAt: undefined,
      progress: { current: 7, target: 30 },
    })
    expect(memberBadge('member-sergio', 'ferocious').progress).toEqual({
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
    expect(memberBadge('member-carla', 'ferocious')).toMatchObject({
      unlockedAt: '2026-07-17T21:00:00+02:00',
      progress: { current: 4, target: 4 },
    })
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
      holdersOf('paragon', closedScope).map(({ member }) => member.id),
    ).toEqual(['member-biel', 'member-carla', 'member-sergio'])
  })

  it('lists the holders from the first to unlock the badge', () => {
    const holders = holdersOf('ferocious')

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

  it('ignores a Top 4 in a field too small to mean anything', () => {
    const data = structuredClone(demoData) as DemoDataSet
    const standing = data.eventStandings.find(
      ({ id }) => id === 'standing-fnm-standard-2026-05-29',
    )!

    expect(
      standing.entries.find(({ memberId }) => memberId === 'member-sergio')
        ?.rank,
    ).toBeLessThanOrEqual(4)
    expect(memberBadge('member-sergio', 'citys-blessing').progress).toEqual({
      current: 7,
      target: 10,
    })

    standing.entries = standing.entries.slice(0, 5)

    expect(
      memberBadge('member-sergio', 'citys-blessing', activeScope, data)
        .progress,
    ).toEqual({ current: 6, target: 10 })
  })

  it('does not break a streak with an event the member did not play', () => {
    const data = structuredClone(demoData) as DemoDataSet
    const skipped = data.eventStandings.find(
      ({ id }) => id === 'standing-win-a-box-2hg-2026-07-18',
    )!

    expect(
      skipped.entries.some(({ memberId }) => memberId === 'member-sergio'),
    ).toBe(false)

    for (const standing of data.eventStandings) {
      const entry = standing.entries.find(
        ({ memberId }) => memberId === 'member-sergio',
      )

      if (entry) {
        entry.rank = 10
      }
    }

    // Two of these sit on either side of the event Sergio skipped, so the
    // streak only reaches three if the missed week is ignored.
    for (const standingId of [
      'standing-fnm-standard-2026-07-17',
      'standing-fnm-standard-2026-07-24',
      'standing-store-championship-modern-2026-07-25',
    ]) {
      data.eventStandings
        .find(({ id }) => id === standingId)!
        .entries.find(({ memberId }) => memberId === 'member-sergio')!.rank = 1
    }

    expect(
      memberBadge('member-sergio', 'prowess', activeScope, data).progress,
    ).toEqual({ current: 3, target: 3 })
  })

  it('lets a streak run across an event too small to count', () => {
    const data = structuredClone(demoData) as DemoDataSet
    const entryOf = (standingId: string) =>
      data.eventStandings
        .find(({ id }) => id === standingId)!
        .entries.find(({ memberId }) => memberId === 'member-sergio')!
    const chain = [
      'standing-fnm-standard-2026-07-10',
      'standing-win-a-box-modern-2026-07-11',
      'standing-fnm-standard-2026-07-17',
      'standing-fnm-standard-2026-07-24',
    ]

    for (const standing of data.eventStandings) {
      const entry = standing.entries.find(
        ({ memberId }) => memberId === 'member-sergio',
      )

      if (entry) {
        entry.rank = 10
      }
    }

    for (const standingId of chain) {
      entryOf(standingId).rank = 1
    }

    expect(
      memberBadge('member-sergio', 'prowess', activeScope, data).progress,
    ).toEqual({ current: 3, target: 3 })

    const interrupted = entryOf('standing-win-a-box-modern-2026-07-11')
    interrupted.rank = 10

    expect(
      memberBadge('member-sergio', 'prowess', activeScope, data),
    ).toMatchObject({
      unlockedAt: undefined,
      progress: { current: 2, target: 3 },
    })

    const smallStanding = data.eventStandings.find(
      ({ id }) => id === 'standing-win-a-box-modern-2026-07-11',
    )!
    smallStanding.entries = [
      interrupted,
      ...smallStanding.entries
        .filter((entry) => entry !== interrupted)
        .slice(0, 4),
    ]

    expect(
      memberBadge('member-sergio', 'prowess', activeScope, data).progress,
    ).toEqual({ current: 3, target: 3 })
  })

  it('counts a win in a crowded field on its own', () => {
    const data = structuredClone(demoData) as DemoDataSet
    const standing = data.eventStandings.find(
      ({ id }) => id === 'standing-win-a-box-standard-2026-08-02',
    )!
    const winner = standing.entries.find(({ rank }) => rank === 1)!

    expect(standing.entries.length).toBeLessThan(24)
    expect(
      memberBadge(winner.memberId!, 'melee', activeScope, data).unlockedAt,
    ).toBeUndefined()

    const filler = { ...standing.entries[standing.entries.length - 1] }
    while (standing.entries.length < 24) {
      standing.entries.push({
        ...filler,
        memberId: undefined,
        rank: standing.entries.length + 1,
      })
    }

    expect(
      memberBadge(winner.memberId!, 'melee', activeScope, data).unlockedAt,
    ).toBe('2026-08-02T21:30:00+02:00')
  })

  it('counts the formats a member has actually won', () => {
    const data = structuredClone(demoData) as DemoDataSet

    expect(memberBadge('member-carla', 'changeling').progress).toEqual({
      current: 1,
      target: 2,
    })

    const modern = data.eventStandings.find(
      ({ id }) => id === 'standing-store-championship-modern-2026-07-25',
    )!
    const carla = modern.entries.find(
      ({ memberId }) => memberId === 'member-carla',
    )!
    const leader = modern.entries.find(({ rank }) => rank === 1)!

    leader.rank = carla.rank
    carla.rank = 1

    expect(
      memberBadge('member-carla', 'changeling', activeScope, data).progress,
    ).toEqual({ current: 2, target: 2 })
  })

  it('returns nothing for an unknown season', () => {
    const unknownScope = { gameId: 'game-mtg', seasonId: 'ranking-season-x' }

    expect(getSeasonBadgeBoard(demoData, unknownScope)).toBeUndefined()
    expect(
      getMemberSeasonBadges(demoData, 'member-carla', unknownScope),
    ).toBeUndefined()
  })
})
