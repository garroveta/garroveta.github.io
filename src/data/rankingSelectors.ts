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

export { getCommunityPoints } from './rankingSettings'

export const RANKING_REFERENCE_TIME = '2026-08-06T12:00:00+02:00'

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
  months: 3 | 6 | 12
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

function subtractMonths(referenceTime: string, months: number) {
  const cutoff = new Date(referenceTime)
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months)
  return cutoff.getTime()
}

export function getCommunityLeaderboard(
  data: DemoDataSet,
  filters: RankingFilters,
  referenceTime = new Date().toISOString(),
): CommunityRankingPlayer[] {
  const referenceTimestamp = new Date(referenceTime).getTime()
  const cutoffTimestamp = subtractMonths(referenceTime, filters.months)
  const approvedMembers = new Map(
    data.members
      .filter(({ status }) => status === 'approved')
      .map((member) => [member.id, member]),
  )
  const totals = new Map<
    string,
    Omit<CommunityRankingPlayer, 'rank' | 'member'>
  >()

  for (const item of getLatestEventStandings(data)) {
    const eventTimestamp = new Date(
      item.event.endsAt ?? item.event.startsAt,
    ).getTime()
    const matchesFilters =
      item.event.countsForCommunityRanking === true &&
      item.game.id === filters.gameId &&
      (!filters.formatId || item.format.id === filters.formatId) &&
      (!filters.competitionEventKindId ||
        item.eventKind?.id === filters.competitionEventKindId) &&
      eventTimestamp >= cutoffTimestamp &&
      eventTimestamp <= referenceTimestamp

    if (!matchesFilters) {
      continue
    }

    for (const entry of item.standing.entries) {
      if (!entry.memberId || !approvedMembers.has(entry.memberId)) {
        continue
      }

      const current = totals.get(entry.memberId) ?? {
        points: 0,
        eventsPlayed: 0,
        eventWins: 0,
        podiums: 0,
        bestRank: Number.POSITIVE_INFINITY,
        latestResultAt: item.event.endsAt ?? item.event.startsAt,
      }

      totals.set(entry.memberId, {
        points:
          current.points + getCommunityPoints(entry.rank, data.rankingSettings),
        eventsPlayed: current.eventsPlayed + 1,
        eventWins: current.eventWins + Number(entry.rank === 1),
        podiums: current.podiums + Number(entry.rank <= 3),
        bestRank: Math.min(current.bestRank, entry.rank),
        latestResultAt:
          new Date(item.event.endsAt ?? item.event.startsAt).getTime() >
          new Date(current.latestResultAt).getTime()
            ? (item.event.endsAt ?? item.event.startsAt)
            : current.latestResultAt,
      })
    }
  }

  return [...totals.entries()]
    .flatMap(([memberId, result]) => {
      const member = approvedMembers.get(memberId)
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
