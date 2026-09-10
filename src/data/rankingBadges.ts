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
  | 'top4'
  | 'polivalencia'
  | 'invicto'
  | 'temporada'

export type BadgeCounter =
  'played' | 'wins' | 'topFour' | 'formats' | 'undefeated'

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
 * Named in the players' own words: a Magic player finishes in the Top 4, never
 * "on a podium". Kept short on purpose: a badge nobody can name is a badge
 * nobody wants, and
 * one that everybody holds is worth nothing. Thresholds are sized for two to
 * three MTG tournaments a week, around 65 counted events a season, played by
 * 25 to 50 ranked members. A community with another rhythm changes them here,
 * in one place.
 *
 * Names stay gender neutral: every badge is worn by any member.
 */
export const SEASON_BADGES: BadgeDefinition[] = [
  {
    id: 'habitual',
    name: 'Habitual',
    description: 'Juega 8 eventos puntuables',
    family: 'participacion',
    counter: 'played',
    target: 8,
  },
  {
    id: 'de-la-casa',
    name: 'De la casa',
    description: 'Juega 20 eventos puntuables',
    family: 'participacion',
    counter: 'played',
    target: 20,
  },
  {
    id: 'pilar-de-la-temporada',
    name: 'Pilar de la temporada',
    description: 'Juega 40 eventos puntuables',
    family: 'participacion',
    counter: 'played',
    target: 40,
  },
  {
    id: '4x4',
    name: '4x4',
    description: 'Termina 4 veces en el Top 4',
    family: 'top4',
    counter: 'topFour',
    target: 4,
  },
  {
    id: 'siempre-arriba',
    name: 'Siempre arriba',
    description: 'Termina 12 veces en el Top 4',
    family: 'top4',
    counter: 'topFour',
    target: 12,
  },
  {
    id: 'imparable',
    name: 'Imparable',
    description: 'Termina 25 veces en el Top 4',
    family: 'top4',
    counter: 'topFour',
    target: 25,
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
    id: 'coleccionista-de-titulos',
    name: 'Coleccionista de títulos',
    description: 'Gana 8 eventos puntuables',
    family: 'victorias',
    counter: 'wins',
    target: 8,
  },
  {
    id: 'leyenda-de-la-temporada',
    name: 'Leyenda de la temporada',
    description: 'Gana 15 eventos puntuables',
    family: 'victorias',
    counter: 'wins',
    target: 15,
  },
  {
    id: 'todoterreno',
    name: 'Todoterreno',
    description: 'Puntúa en 4 formatos distintos',
    family: 'polivalencia',
    counter: 'formats',
    target: 4,
  },
  {
    id: 'invicto',
    name: 'Invicto',
    description: 'Acaba 5 eventos sin derrotas, con 3 victorias o más',
    family: 'invicto',
    counter: 'undefeated',
    target: 5,
  },
  {
    id: 'podio-de-la-temporada',
    name: 'Podio de la temporada',
    description: 'Acaba entre los tres primeros de la clasificación final',
    family: 'temporada',
    finalRank: 3,
  },
  {
    id: 'titulo-de-la-temporada',
    name: 'Título de la temporada',
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
    counters: { played: 0, wins: 0, topFour: 0, formats: 0, undefeated: 0 },
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
      progress.counters.topFour += Number(entry.rank <= 4)
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
