import type {
  CommunityMember,
  CommunityRankingSeason,
  DemoDataSet,
} from '../domain/types'
import { getEligibleRankingMemberIds } from './rankingSeasons'
import {
  getCommunityLeaderboard,
  getRankingSeasonStandings,
  getResolvedEventDate,
} from './rankingSelectors'

export type BadgeFamily =
  | 'participacion'
  | 'victorias'
  | 'podios'
  | 'polivalencia'
  | 'impecable'
  | 'temporada'

export type BadgeCounter =
  'played' | 'wins' | 'podiums' | 'formats' | 'undefeated'

export type BadgeDefinition = {
  id: string
  name: string
  description: string
  family: BadgeFamily
  /** Counted results and threshold, absent when the closing decides the badge. */
  counter?: BadgeCounter
  target?: number
  /** Place to hold in the final ranking of a closed season. */
  finalRank?: number
}

export type BadgeScope = {
  gameId: string
  seasonId: string
}

export type MemberBadge = {
  definition: BadgeDefinition
  unlockedAt?: string
  progress?: { current: number; target: number }
}

export type BadgeHolder = {
  member: CommunityMember
  unlockedAt: string
}

export type SeasonBadge = {
  definition: BadgeDefinition
  holders: BadgeHolder[]
}

export type SeasonBadgeBoard = {
  season: CommunityRankingSeason
  /** Members with at least one counted result, the rarity denominator. */
  players: number
  badges: SeasonBadge[]
}

/**
 * Kept deliberately short: a badge nobody can name is a badge nobody wants.
 * Thresholds are sized for one season, not for a career.
 */
/**
 * Thresholds assume a weekly cadence, around 25 counted events per season.
 * A community that plays less often should lower them here, in one place.
 */
export const SEASON_BADGES: BadgeDefinition[] = [
  {
    id: 'debut',
    name: 'Debut',
    description: 'Juega tu primer evento puntuable de la temporada',
    family: 'participacion',
    counter: 'played',
    target: 1,
  },
  {
    id: 'habitual',
    name: 'Habitual',
    description: 'Juega 5 eventos puntuables',
    family: 'participacion',
    counter: 'played',
    target: 5,
  },
  {
    id: 'de-la-casa',
    name: 'De la casa',
    description: 'Juega 12 eventos puntuables',
    family: 'participacion',
    counter: 'played',
    target: 12,
  },
  {
    id: 'pilar-de-la-temporada',
    name: 'Pilar de la temporada',
    description: 'Juega 20 eventos puntuables',
    family: 'participacion',
    counter: 'played',
    target: 20,
  },
  {
    id: 'primer-podio',
    name: 'Primer podio',
    description: 'Termina entre los tres primeros de un evento',
    family: 'podios',
    counter: 'podiums',
    target: 1,
  },
  {
    id: 'podio-habitual',
    name: 'Podio habitual',
    description: 'Termina 3 veces entre los tres primeros',
    family: 'podios',
    counter: 'podiums',
    target: 3,
  },
  {
    id: 'siempre-arriba',
    name: 'Siempre arriba',
    description: 'Termina 8 veces entre los tres primeros',
    family: 'podios',
    counter: 'podiums',
    target: 8,
  },
  {
    id: 'primer-titulo',
    name: 'Primer título',
    description: 'Gana un evento puntuable',
    family: 'victorias',
    counter: 'wins',
    target: 1,
  },
  {
    id: 'triplete',
    name: 'Triplete',
    description: 'Gana 3 eventos puntuables',
    family: 'victorias',
    counter: 'wins',
    target: 3,
  },
  {
    id: 'dominador',
    name: 'Dominador',
    description: 'Gana 5 eventos puntuables',
    family: 'victorias',
    counter: 'wins',
    target: 5,
  },
  {
    id: 'dos-formatos',
    name: 'Dos formatos',
    description: 'Puntúa en 2 formatos distintos',
    family: 'polivalencia',
    counter: 'formats',
    target: 2,
  },
  {
    id: 'todoterreno',
    name: 'Todoterreno',
    description: 'Puntúa en 3 formatos distintos',
    family: 'polivalencia',
    counter: 'formats',
    target: 3,
  },
  {
    id: 'impecable',
    name: 'Impecable',
    description: 'Gana 3 rondas o más en un evento sin perder ninguna',
    family: 'impecable',
    counter: 'undefeated',
    target: 1,
  },
  {
    id: 'podio-de-la-temporada',
    name: 'Podio de la temporada',
    description: 'Acaba entre los tres primeros de la clasificación final',
    family: 'temporada',
    finalRank: 3,
  },
  {
    id: 'campeon-de-la-temporada',
    name: 'Campeón de la temporada',
    description: 'Acaba primero de la clasificación final',
    family: 'temporada',
    finalRank: 1,
  },
]

/** Below this, an undefeated run only means the day was short. */
const CLEAN_RUN_WINS = 3

type BadgeCounters = Record<BadgeCounter, number>

type MemberProgress = {
  counters: BadgeCounters
  unlockedAt: Map<string, string>
}

function createProgress(): MemberProgress {
  return {
    counters: { played: 0, wins: 0, podiums: 0, formats: 0, undefeated: 0 },
    unlockedAt: new Map(),
  }
}

/**
 * Walks the counted results in chronological order so a badge keeps the date
 * of the result that unlocked it, instead of the date it was last looked at.
 */
function collectProgress(
  data: DemoDataSet,
  scope: BadgeScope,
  season: CommunityRankingSeason,
) {
  const eligibleMemberIds = getEligibleRankingMemberIds(season, data.members)
  const progressByMember = new Map<string, MemberProgress>()
  const formatsByMember = new Map<string, Set<string>>()
  const standings = getRankingSeasonStandings(data, {
    gameId: scope.gameId,
    seasonId: scope.seasonId,
  })

  for (const item of [...standings].reverse()) {
    const playedAt = getResolvedEventDate(item)

    for (const entry of item.standing.entries) {
      if (!entry.memberId || !eligibleMemberIds.has(entry.memberId)) {
        continue
      }

      const progress = progressByMember.get(entry.memberId) ?? createProgress()
      const formats = formatsByMember.get(entry.memberId) ?? new Set<string>()

      progressByMember.set(entry.memberId, progress)
      formatsByMember.set(entry.memberId, formats)
      formats.add(item.format.id)
      progress.counters.played += 1
      progress.counters.wins += Number(entry.rank === 1)
      progress.counters.podiums += Number(entry.rank <= 3)
      progress.counters.undefeated += Number(
        entry.wins >= CLEAN_RUN_WINS && entry.losses === 0,
      )
      progress.counters.formats = formats.size

      for (const badge of SEASON_BADGES) {
        if (
          badge.counter &&
          badge.target !== undefined &&
          !progress.unlockedAt.has(badge.id) &&
          progress.counters[badge.counter] >= badge.target
        ) {
          progress.unlockedAt.set(badge.id, playedAt)
        }
      }
    }
  }

  if (season.status === 'closed') {
    for (const player of getCommunityLeaderboard(data, {
      gameId: scope.gameId,
      seasonId: scope.seasonId,
    })) {
      const progress = progressByMember.get(player.member.id)

      for (const badge of SEASON_BADGES) {
        if (
          progress &&
          badge.finalRank !== undefined &&
          player.rank <= badge.finalRank
        ) {
          progress.unlockedAt.set(badge.id, season.endsOn)
        }
      }
    }
  }

  return progressByMember
}

function findSeason(data: DemoDataSet, scope: BadgeScope) {
  return data.rankingSeasons.find(({ id }) => id === scope.seasonId)
}

/**
 * Every badge of the scope with the members who unlocked it, earliest first,
 * so the page can show both what a badge is worth and who already has it.
 */
export function getSeasonBadgeBoard(
  data: DemoDataSet,
  scope: BadgeScope,
): SeasonBadgeBoard | undefined {
  const season = findSeason(data, scope)

  if (!season) {
    return undefined
  }

  const progressByMember = collectProgress(data, scope, season)
  const membersById = new Map(data.members.map((member) => [member.id, member]))

  return {
    season,
    players: progressByMember.size,
    badges: SEASON_BADGES.map((definition) => ({
      definition,
      holders: [...progressByMember.entries()]
        .flatMap(([memberId, progress]) => {
          const member = membersById.get(memberId)
          const unlockedAt = progress.unlockedAt.get(definition.id)

          return member && unlockedAt ? [{ member, unlockedAt }] : []
        })
        .sort(
          (first, second) =>
            new Date(first.unlockedAt).getTime() -
              new Date(second.unlockedAt).getTime() ||
            first.member.displayName.localeCompare(
              second.member.displayName,
              'es',
            ),
        ),
    })),
  }
}

/**
 * The same badges seen by one member, locked ones included: a locked badge
 * always shows how far it is, never a hidden condition.
 */
export function getMemberSeasonBadges(
  data: DemoDataSet,
  memberId: string,
  scope: BadgeScope,
): MemberBadge[] | undefined {
  const season = findSeason(data, scope)

  if (!season) {
    return undefined
  }

  const progress = collectProgress(data, scope, season).get(memberId)

  return SEASON_BADGES.map((definition) => ({
    definition,
    unlockedAt: progress?.unlockedAt.get(definition.id),
    progress:
      definition.counter && definition.target !== undefined
        ? {
            current: Math.min(
              progress?.counters[definition.counter] ?? 0,
              definition.target,
            ),
            target: definition.target,
          }
        : undefined,
  }))
}
