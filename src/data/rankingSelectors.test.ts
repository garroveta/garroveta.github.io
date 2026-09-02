import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import {
  getCommunityLeaderboard,
  getCommunityPoints,
  getLatestEventStandings,
  RANKING_REFERENCE_TIME,
} from './rankingSelectors'

describe('rankingSelectors', () => {
  it('applies the simple community points scale', () => {
    expect([1, 2, 3, 4, 5, 6, 10, 11].map(getCommunityPoints)).toEqual([
      10, 8, 6, 5, 4, 3, 3, 1,
    ])
  })

  it('lists completed standings from the most recent event', () => {
    const standings = getLatestEventStandings(demoData)

    expect(standings[0]).toMatchObject({
      event: { title: 'Win a Box Standard' },
      game: { shortName: 'MTG' },
      format: { shortName: 'Standard' },
      eventKind: { shortName: 'Win a Box' },
    })
    expect(standings[0].standing.entries.slice(0, 4)).toMatchObject([
      { rank: 1, eventPoints: 9, wins: 3, losses: 0, draws: 0 },
      { rank: 2, eventPoints: 7, wins: 2, losses: 0, draws: 1 },
      { rank: 3, eventPoints: 7, wins: 2, losses: 0, draws: 1 },
      { rank: 4, eventPoints: 6, wins: 2, losses: 1, draws: 0 },
    ])
  })

  it('keeps a result in the ranking when its event has no series', () => {
    const data = structuredClone(demoData)
    const latestEvent = data.events.find(
      ({ id }) => id === 'event-result-win-a-box-standard-2026-08-02',
    )!
    latestEvent.competitionEventKindId = undefined

    expect(getLatestEventStandings(data)[0]).toMatchObject({
      event: { id: latestEvent.id },
      eventKind: undefined,
    })
    expect(
      getCommunityLeaderboard(
        data,
        {
          gameId: 'game-mtg',
          formatId: 'format-mtg-standard',
          months: 6,
        },
        RANKING_REFERENCE_TIME,
      )[0],
    ).toMatchObject({
      member: { displayName: 'Carla Pons Alcover' },
      points: 47,
    })
  })

  it('builds a six-month MTG Standard ranking across all event kinds', () => {
    const ranking = getCommunityLeaderboard(
      demoData,
      {
        gameId: 'game-mtg',
        formatId: 'format-mtg-standard',
        months: 6,
      },
      RANKING_REFERENCE_TIME,
    )

    expect(
      ranking
        .slice(0, 3)
        .map(({ member, points }) => [member.displayName, points]),
    ).toEqual([
      ['Carla Pons Alcover', 47],
      ['Sergio Gil', 46],
      ['Biel Ferrer', 42],
    ])
    expect(ranking.every(({ member }) => member.status === 'approved')).toBe(
      true,
    )
    expect(ranking.some(({ member }) => member.displayName === 'Toni M.')).toBe(
      false,
    )
  })

  it('filters the cumulative ranking by FNM and rolling period', () => {
    const sixMonths = getCommunityLeaderboard(
      demoData,
      {
        gameId: 'game-mtg',
        formatId: 'format-mtg-standard',
        competitionEventKindId: 'event-kind-fnm',
        months: 6,
      },
      RANKING_REFERENCE_TIME,
    )
    const twelveMonths = getCommunityLeaderboard(
      demoData,
      {
        gameId: 'game-mtg',
        formatId: 'format-mtg-standard',
        competitionEventKindId: 'event-kind-fnm',
        months: 12,
      },
      RANKING_REFERENCE_TIME,
    )

    expect(sixMonths[0]).toMatchObject({ points: 38, eventsPlayed: 5 })
    expect(twelveMonths[0].eventsPlayed).toBe(6)
  })

  it('keeps games separate', () => {
    const onePieceRanking = getCommunityLeaderboard(
      demoData,
      {
        gameId: 'game-one-piece',
        months: 6,
      },
      RANKING_REFERENCE_TIME,
    )

    expect(onePieceRanking[0]).toMatchObject({
      member: { displayName: 'Marc Vidal' },
      points: 10,
      eventWins: 1,
    })
  })
})
