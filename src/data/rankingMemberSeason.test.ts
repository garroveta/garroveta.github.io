import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import { getMemberSeasonSummary } from './rankingMemberSeason'
import type { DemoDataSet } from '../domain/types'

const standardFilters = {
  gameId: 'game-mtg',
  formatId: 'format-mtg-standard',
  seasonId: 'ranking-season-2026',
}

function summaryOf(data: DemoDataSet, memberId: string) {
  return getMemberSeasonSummary(data, memberId, standardFilters)!
}

function withoutMemberInStanding(standingId: string, memberId: string) {
  const data = structuredClone(demoData) as DemoDataSet
  const standing = data.eventStandings.find(({ id }) => id === standingId)!
  standing.entries = standing.entries.filter(
    (entry) => entry.memberId !== memberId,
  )

  return data
}

describe('rankingMemberSeason', () => {
  it('derives the personal season from the counted standings', () => {
    const summary = summaryOf(demoData, 'member-carla')

    expect(summary).toMatchObject({
      season: { name: 'Temporada 2026' },
      player: { rank: 1, points: 47, eventsPlayed: 6 },
      rankedPlayers: 15,
      seasonEvents: 6,
      currentStreak: 6,
    })
    expect(summary.results.map(({ rank, points }) => [rank, points])).toEqual([
      [1, 10],
      [2, 8],
      [4, 5],
      [2, 8],
      [1, 10],
      [3, 6],
    ])
    expect(
      summary.results.reduce((total, { points }) => total + points, 0),
    ).toBe(summary.player?.points)
  })

  it('keeps the best rank of the season and the latest result', () => {
    const summary = summaryOf(demoData, 'member-nora')

    expect(summary.bestResult).toMatchObject({
      rank: 1,
      points: 10,
      players: 15,
      event: { title: 'FNM Standard' },
    })
    expect(summary.latestResult).toMatchObject({
      rank: 3,
      event: { title: 'Win a Box Standard' },
    })
  })

  it('prefers the biggest field between two equally good results', () => {
    const data = structuredClone(demoData) as DemoDataSet
    const earlier = data.eventStandings.find(
      ({ id }) => id === 'standing-fnm-standard-2026-06-26',
    )!

    expect(summaryOf(demoData, 'member-carla').bestResult).toMatchObject({
      rank: 1,
      players: 14,
      event: { title: 'Win a Box Standard' },
    })

    earlier.entries.push({
      ...earlier.entries[earlier.entries.length - 1],
      rank: earlier.entries.length + 1,
      memberId: undefined,
      displayName: 'Invitado sin cuenta',
    })

    expect(summaryOf(data, 'member-carla').bestResult).toMatchObject({
      rank: 1,
      players: 15,
      event: { title: 'FNM Standard' },
    })
  })

  it('measures the places the last result gained or lost', () => {
    expect(summaryOf(demoData, 'member-carla')).toMatchObject({
      previousRank: 3,
      rankDelta: 2,
    })
    expect(summaryOf(demoData, 'member-sergio')).toMatchObject({
      previousRank: 1,
      rankDelta: -1,
    })
  })

  it('reports the gaps with both neighbours', () => {
    expect(summaryOf(demoData, 'member-sergio')).toMatchObject({
      pointsToPlaceAbove: 1,
      pointsOverPlaceBelow: 4,
    })
    expect(summaryOf(demoData, 'member-carla')).toMatchObject({
      pointsToPlaceAbove: undefined,
      pointsOverPlaceBelow: 1,
    })
  })

  it('projects the cheapest placement that gains a place', () => {
    expect(summaryOf(demoData, 'member-sergio').projection).toEqual({
      placement: 10,
      points: 3,
      resultingRank: 1,
    })
    expect(summaryOf(demoData, 'member-nora').projection).toEqual({
      placement: 2,
      points: 8,
      resultingRank: 3,
    })
  })

  it('never promises a place a tie-breaker could refuse', () => {
    const summary = summaryOf(demoData, 'member-nora')
    const placeAbove = 42

    expect(summary.player?.points).toBe(36)
    expect(summary.pointsToPlaceAbove).toBe(placeAbove - 36)
    expect(summary.projection?.points).toBeGreaterThan(placeAbove - 36)
  })

  it('leaves the leader without a projection', () => {
    expect(summaryOf(demoData, 'member-carla').projection).toBeUndefined()
  })

  it('tells an unranked member what a first result would give', () => {
    const summary = summaryOf(demoData, 'member-lucia')

    expect(summary).toMatchObject({
      player: undefined,
      results: [],
      previousRank: undefined,
      rankDelta: undefined,
      currentStreak: 0,
    })
    expect(summary.projection).toEqual({
      placement: 10,
      points: 3,
      resultingRank: 15,
    })
  })

  it('breaks the streak on a missed event', () => {
    expect(
      summaryOf(
        withoutMemberInStanding(
          'standing-win-a-box-standard-2026-08-02',
          'member-carla',
        ),
        'member-carla',
      ).currentStreak,
    ).toBe(0)
    expect(
      summaryOf(
        withoutMemberInStanding(
          'standing-fnm-standard-2026-07-24',
          'member-carla',
        ),
        'member-carla',
      ).currentStreak,
    ).toBe(1)
  })

  it('ignores results of a member the closed season never included', () => {
    const data = structuredClone(demoData) as DemoDataSet
    const lateMember = data.members.find(
      ({ id }) => id === 'member-lucas-pending',
    )!
    lateMember.status = 'approved'
    const closedStanding = data.eventStandings.find(
      ({ id }) => id === 'standing-fnm-standard-2025-11-28',
    )!
    closedStanding.entries[0].memberId = lateMember.id

    const summary = getMemberSeasonSummary(data, lateMember.id, {
      ...standardFilters,
      seasonId: 'ranking-season-2025',
    })!

    expect(summary).toMatchObject({
      player: undefined,
      results: [],
      currentStreak: 0,
    })
  })

  it('returns nothing for an unknown season', () => {
    expect(
      getMemberSeasonSummary(demoData, 'member-carla', {
        ...standardFilters,
        seasonId: 'ranking-season-unknown',
      }),
    ).toBeUndefined()
  })
})
