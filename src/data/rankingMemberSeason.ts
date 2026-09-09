import type {
  CommunityEvent,
  CommunityRankingSeason,
  DemoDataSet,
} from '../domain/types'
import {
  getCommunityLeaderboard,
  getCommunityPoints,
  getRankingSeasonStandings,
  getResolvedEventDate,
  type CommunityRankingPlayer,
  type RankingFilters,
} from './rankingSelectors'
import { getEligibleRankingMemberIds } from './rankingSeasons'

/**
 * Placements that change the reward, from the easiest to the hardest. Rank 11
 * stands for every placement paid at the participation rate.
 */
const PLACEMENT_TIERS = [11, 10, 5, 4, 3, 2, 1]

export type MemberSeasonResult = {
  event: CommunityEvent
  rank: number
  points: number
  players: number
  playedAt: string
}

export type MemberSeasonProjection = {
  /** Placement to reach, 11 meaning "any placement outside the top ten". */
  placement: number
  points: number
  resultingRank: number
}

export type MemberSeasonSummary = {
  season: CommunityRankingSeason
  player?: CommunityRankingPlayer
  rankedPlayers: number
  seasonEvents: number
  /** Counted results of the member, most recent first. */
  results: MemberSeasonResult[]
  latestResult?: MemberSeasonResult
  bestResult?: MemberSeasonResult
  previousRank?: number
  rankDelta?: number
  pointsToPlaceAbove?: number
  pointsOverPlaceBelow?: number
  currentStreak: number
  projection?: MemberSeasonProjection
}

function pickBestResult(results: MemberSeasonResult[]) {
  return [...results].sort(
    (first, second) =>
      first.rank - second.rank ||
      second.players - first.players ||
      new Date(second.playedAt).getTime() - new Date(first.playedAt).getTime(),
  )[0]
}

/**
 * Counts the results in a row up to the last counted event of the season: a
 * missed event breaks the streak, which is what makes it worth keeping.
 */
function countCurrentStreak(
  standings: ReturnType<typeof getRankingSeasonStandings>,
  memberId: string,
) {
  let streak = 0

  for (const item of standings) {
    if (!item.standing.entries.some((entry) => entry.memberId === memberId)) {
      return streak
    }

    streak += 1
  }

  return streak
}

/**
 * Cheapest placement that would gain at least one position, assuming the other
 * players do not score. Ties are resolved against the member so the projection
 * never promises a place the tie-breakers could refuse.
 */
function projectNextPlacement(
  leaderboard: CommunityRankingPlayer[],
  season: CommunityRankingSeason,
  memberId: string,
  currentPoints: number,
  currentRank: number,
): MemberSeasonProjection | undefined {
  const others = leaderboard.filter(({ member }) => member.id !== memberId)

  for (const placement of PLACEMENT_TIERS) {
    const points = getCommunityPoints(placement, season.points)
    const projectedPoints = currentPoints + points
    const resultingRank =
      1 + others.filter((other) => other.points >= projectedPoints).length

    if (resultingRank < currentRank) {
      return { placement, points, resultingRank }
    }
  }

  return undefined
}

/**
 * Season seen from one member: the standings already drive the leaderboard, so
 * the personal view is derived from them rather than stored.
 */
export function getMemberSeasonSummary(
  data: DemoDataSet,
  memberId: string,
  filters: RankingFilters,
): MemberSeasonSummary | undefined {
  const season = data.rankingSeasons.find(({ id }) => id === filters.seasonId)

  if (!season) {
    return undefined
  }

  const leaderboard = getCommunityLeaderboard(data, filters)
  const standings = getRankingSeasonStandings(data, filters)
  const isEligible = getEligibleRankingMemberIds(season, data.members).has(
    memberId,
  )
  const results = isEligible
    ? standings.flatMap((item) => {
        const entry = item.standing.entries.find(
          (candidate) => candidate.memberId === memberId,
        )

        return entry
          ? [
              {
                event: item.event,
                rank: entry.rank,
                points: getCommunityPoints(entry.rank, season.points),
                players: item.standing.entries.length,
                playedAt: getResolvedEventDate(item),
              },
            ]
          : []
      })
    : []
  const player = isEligible
    ? leaderboard.find(({ member }) => member.id === memberId)
    : undefined
  const latestResult = results[0]
  const previousRank = latestResult
    ? getCommunityLeaderboard(data, {
        ...filters,
        before: latestResult.playedAt,
      }).find(({ member }) => member.id === memberId)?.rank
    : undefined
  const currentPoints = player?.points ?? 0
  const currentRank = player?.rank ?? leaderboard.length + 1
  const placeAbove = player ? leaderboard[player.rank - 2] : undefined
  const placeBelow = player ? leaderboard[player.rank] : undefined

  return {
    season,
    player,
    rankedPlayers: leaderboard.length,
    seasonEvents: standings.length,
    results,
    latestResult,
    bestResult: pickBestResult(results),
    previousRank,
    rankDelta:
      player && previousRank !== undefined
        ? previousRank - player.rank
        : undefined,
    pointsToPlaceAbove: placeAbove
      ? placeAbove.points - currentPoints
      : undefined,
    pointsOverPlaceBelow: placeBelow
      ? currentPoints - placeBelow.points
      : undefined,
    currentStreak: isEligible ? countCurrentStreak(standings, memberId) : 0,
    projection: projectNextPlacement(
      leaderboard,
      season,
      memberId,
      currentPoints,
      currentRank,
    ),
  }
}
