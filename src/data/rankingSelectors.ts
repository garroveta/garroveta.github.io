import type {
  CommunityEvent,
  CommunityGame,
  CommunityMember,
  CompetitionEventKind,
  CompetitionFormat,
  DemoDataSet,
  EventStanding,
} from '../domain/types'
import { getCommunityPoints } from './rankingSettings'
import {
  getEligibleRankingMemberIds,
  getRankingSeasonForDate,
} from './rankingSeasons'

export { getCommunityPoints } from './rankingSettings'

export type ResolvedEventStanding = {
  standing: EventStanding
  event: CommunityEvent
  game: CommunityGame
  format: CompetitionFormat
  eventKind?: CompetitionEventKind
}

export type RankingFilters = {
  gameId: string
  formatId?: string
  competitionEventKindId?: string
  seasonId: string
  /**
   * Exclusive upper bound on the event date, to rebuild the ranking as it
   * stood before a given result instead of as it stands today.
   */
  before?: string
}

export type CommunityRankingPlayer = {
  rank: number
  member: CommunityMember
  points: number
  eventsPlayed: number
  eventWins: number
  podiums: number
  bestRank: number
  latestResultAt: string
}

export function getResolvedEventDate({ event }: ResolvedEventStanding) {
  return event.endsAt ?? event.startsAt
}

function resolveStanding(
  data: DemoDataSet,
  standing: EventStanding,
): ResolvedEventStanding | undefined {
  const event = data.events.find(({ id }) => id === standing.eventId)
  const game = event?.gameId
    ? data.games.find(({ id }) => id === event.gameId)
    : undefined
  const format = event?.formatId
    ? data.competitionFormats.find(({ id }) => id === event.formatId)
    : undefined
  const eventKind = event?.competitionEventKindId
    ? data.competitionEventKinds.find(
        ({ id }) => id === event.competitionEventKindId,
      )
    : undefined

  return event && game && format
    ? { standing, event, game, format, eventKind }
    : undefined
}

export function getLatestEventStandings(
  data: DemoDataSet,
): ResolvedEventStanding[] {
  return data.eventStandings
    .flatMap((standing) => {
      const resolved = resolveStanding(data, standing)
      return resolved ? [resolved] : []
    })
    .filter(({ event }) => event.status === 'completed')
    .sort(
      (first, second) =>
        new Date(second.event.endsAt ?? second.event.startsAt).getTime() -
        new Date(first.event.endsAt ?? first.event.startsAt).getTime(),
    )
}

/**
 * Results counted by a ranking, most recent first. Shared with the per-member
 * views so a result never appears in one and not in the other.
 */
export function getRankingSeasonStandings(
  data: DemoDataSet,
  filters: RankingFilters,
): ResolvedEventStanding[] {
  const season = data.rankingSeasons.find(({ id }) => id === filters.seasonId)

  if (!season) {
    return []
  }

  const beforeTimestamp = filters.before
    ? new Date(filters.before).getTime()
    : undefined

  return getLatestEventStandings(data).filter((item) => {
    const eventDate = getResolvedEventDate(item)
    const standingSeasonId =
      item.standing.rankingSeasonId ??
      getRankingSeasonForDate(data.rankingSeasons, eventDate)?.id

    return (
      item.event.countsForCommunityRanking === true &&
      standingSeasonId === season.id &&
      item.game.id === filters.gameId &&
      (!filters.formatId || item.format.id === filters.formatId) &&
      (!filters.competitionEventKindId ||
        item.eventKind?.id === filters.competitionEventKindId) &&
      (beforeTimestamp === undefined ||
        new Date(eventDate).getTime() < beforeTimestamp)
    )
  })
}

export function getCommunityLeaderboard(
  data: DemoDataSet,
  filters: RankingFilters,
): CommunityRankingPlayer[] {
  const season = data.rankingSeasons.find(({ id }) => id === filters.seasonId)

  if (!season) {
    return []
  }

  const eligibleMemberIds = getEligibleRankingMemberIds(season, data.members)
  const eligibleMembers = new Map(
    data.members
      .filter(({ id }) => eligibleMemberIds.has(id))
      .map((member) => [member.id, member]),
  )
  const totals = new Map<
    string,
    Omit<CommunityRankingPlayer, 'rank' | 'member'>
  >()

  for (const item of getRankingSeasonStandings(data, filters)) {
    const eventDate = getResolvedEventDate(item)

    for (const entry of item.standing.entries) {
      if (!entry.memberId || !eligibleMembers.has(entry.memberId)) {
        continue
      }

      const current = totals.get(entry.memberId) ?? {
        points: 0,
        eventsPlayed: 0,
        eventWins: 0,
        podiums: 0,
        bestRank: Number.POSITIVE_INFINITY,
        latestResultAt: eventDate,
      }

      totals.set(entry.memberId, {
        points: current.points + getCommunityPoints(entry.rank, season.points),
        eventsPlayed: current.eventsPlayed + 1,
        eventWins: current.eventWins + Number(entry.rank === 1),
        podiums: current.podiums + Number(entry.rank <= 3),
        bestRank: Math.min(current.bestRank, entry.rank),
        latestResultAt:
          new Date(eventDate).getTime() >
          new Date(current.latestResultAt).getTime()
            ? eventDate
            : current.latestResultAt,
      })
    }
  }

  return [...totals.entries()]
    .flatMap(([memberId, result]) => {
      const member = eligibleMembers.get(memberId)
      return member ? [{ member, ...result }] : []
    })
    .sort(
      (first, second) =>
        second.points - first.points ||
        second.eventWins - first.eventWins ||
        second.podiums - first.podiums ||
        new Date(second.latestResultAt).getTime() -
          new Date(first.latestResultAt).getTime() ||
        first.member.displayName.localeCompare(second.member.displayName, 'es'),
    )
    .map((player, index) => ({ ...player, rank: index + 1 }))
}
