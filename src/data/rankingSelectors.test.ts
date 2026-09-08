import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import type { DemoDataSet } from '../domain/types'
import {
  getCommunityLeaderboard,
  getCommunityPoints,
  getLatestEventStandings,
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
    const data = structuredClone(demoData) as DemoDataSet
    const latestEvent = data.events.find(
      ({ id }) => id === 'event-result-win-a-box-standard-2026-08-02',
    )!
    latestEvent.competitionEventKindId = undefined

    expect(getLatestEventStandings(data)[0]).toMatchObject({
      event: { id: latestEvent.id },
      eventKind: undefined,
    })
    expect(
      getCommunityLeaderboard(data, {
        gameId: 'game-mtg',
        formatId: 'format-mtg-standard',
        seasonId: 'ranking-season-2026',
      })[0],
    ).toMatchObject({
      member: { displayName: 'Carla Pons Alcover' },
      points: 47,
    })
  })

  it('builds the active-season MTG Standard ranking across all series', () => {
    const ranking = getCommunityLeaderboard(demoData, {
      gameId: 'game-mtg',
      formatId: 'format-mtg-standard',
      seasonId: 'ranking-season-2026',
    })

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

  it('keeps active and closed seasons separate', () => {
    const activeSeason = getCommunityLeaderboard(demoData, {
      gameId: 'game-mtg',
      formatId: 'format-mtg-standard',
      competitionEventKindId: 'event-kind-fnm',
      seasonId: 'ranking-season-2026',
    })
    const closedSeason = getCommunityLeaderboard(demoData, {
      gameId: 'game-mtg',
      formatId: 'format-mtg-standard',
      competitionEventKindId: 'event-kind-fnm',
      seasonId: 'ranking-season-2025',
    })

    expect(activeSeason[0]).toMatchObject({ points: 38, eventsPlayed: 5 })
    expect(closedSeason[0]).toMatchObject({
      member: { displayName: 'Biel Ferrer' },
      points: 10,
      eventsPlayed: 1,
    })
  })

  it('uses the season persisted with a standing instead of the mutable event date', () => {
    const data = structuredClone(demoData) as DemoDataSet
    const event = data.events.find(
      ({ id }) => id === 'event-result-win-a-box-standard-2026-08-02',
    )!
    const standing = data.eventStandings.find(
      ({ eventId }) => eventId === event.id,
    )!
    standing.rankingSeasonId = 'ranking-season-2026'
    event.startsAt = '2025-08-02T10:00:00+02:00'
    event.endsAt = '2025-08-02T16:00:00+02:00'

    const activeRanking = getCommunityLeaderboard(data, {
      gameId: 'game-mtg',
      formatId: 'format-mtg-standard',
      seasonId: 'ranking-season-2026',
    })
    const closedRanking = getCommunityLeaderboard(data, {
      gameId: 'game-mtg',
      formatId: 'format-mtg-standard',
      seasonId: 'ranking-season-2025',
    })

    expect(activeRanking[0]).toMatchObject({
      member: { displayName: 'Carla Pons Alcover' },
      points: 47,
    })
    expect(closedRanking[0]).toMatchObject({
      member: { displayName: 'Biel Ferrer' },
      points: 10,
    })
  })

  it('keeps games separate', () => {
    const onePieceRanking = getCommunityLeaderboard(demoData, {
      gameId: 'game-one-piece',
      seasonId: 'ranking-season-2026',
    })

    expect(onePieceRanking[0]).toMatchObject({
      member: { displayName: 'Marc Vidal' },
      points: 10,
      eventWins: 1,
    })
  })

  it('does not add a late member to a closed season ranking', () => {
    const data = structuredClone(demoData)
    const lateMember = data.members.find(
      ({ id }) => id === 'member-lucas-pending',
    )!
    lateMember.status = 'approved'
    const closedStanding = data.eventStandings.find(
      ({ id }) => id === 'standing-fnm-standard-2025-11-28',
    )!
    closedStanding.entries[0].memberId = lateMember.id
    closedStanding.entries[0].displayName = lateMember.displayName

    const ranking = getCommunityLeaderboard(data, {
      gameId: 'game-mtg',
      formatId: 'format-mtg-standard',
      seasonId: 'ranking-season-2025',
    })

    expect(ranking.some(({ member }) => member.id === lateMember.id)).toBe(
      false,
    )
  })
})
