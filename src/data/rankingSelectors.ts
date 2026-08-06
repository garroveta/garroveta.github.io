import type {
  CommunityEvent,
  CommunityGame,
  CommunityMember,
  CompetitionEventKind,
  CompetitionFormat,
  DemoDataSet,
  EventStanding,
} from '../domain/types'

export const RANKING_REFERENCE_TIME = '2026-08-06T12:00:00+02:00'

export const communityPointsByRank = [
  { minRank: 1, maxRank: 1, points: 10 },
  { minRank: 2, maxRank: 2, points: 8 },
  { minRank: 3, maxRank: 3, points: 6 },
  { minRank: 4, maxRank: 4, points: 5 },
  { minRank: 5, maxRank: 5, points: 4 },
  { minRank: 6, maxRank: 10, points: 3 },
] as const

export function getCommunityPoints(rank: number) {
  return (
    communityPointsByRank.find(
      ({ minRank, maxRank }) => rank >= minRank && rank <= maxRank,
    )?.points ?? 1
  )
}

export type ResolvedEventStanding = {
  standing: EventStanding
  event: CommunityEvent
  game: CommunityGame
  format: CompetitionFormat
  eventKind: CompetitionEventKind
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

  return event && game && format && eventKind
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
        new Date(second.event.endsAt).getTime() -
        new Date(first.event.endsAt).getTime(),
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
  referenceTime = RANKING_REFERENCE_TIME,
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
    const eventTimestamp = new Date(item.event.endsAt).getTime()
    const matchesFilters =
      item.event.countsForCommunityRanking === true &&
      item.game.id === filters.gameId &&
      (!filters.formatId || item.format.id === filters.formatId) &&
      (!filters.competitionEventKindId ||
        item.eventKind.id === filters.competitionEventKindId) &&
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
        latestResultAt: item.event.endsAt,
      }

      totals.set(entry.memberId, {
        points: current.points + getCommunityPoints(entry.rank),
        eventsPlayed: current.eventsPlayed + 1,
        eventWins: current.eventWins + Number(entry.rank === 1),
        podiums: current.podiums + Number(entry.rank <= 3),
        bestRank: Math.min(current.bestRank, entry.rank),
        latestResultAt:
          new Date(item.event.endsAt).getTime() >
          new Date(current.latestResultAt).getTime()
            ? item.event.endsAt
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
