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
  'attendance' | 'top4' | 'titles' | 'formats' | 'field' | 'season'

export type BadgeCounter =
  | 'played'
  | 'topFour'
  | 'topFourStreak'
  | 'titles'
  | 'formats'
  | 'titleFormats'
  | 'bigWins'

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
    id: 'vigilance',
    name: 'Vigilance',
    description: 'Juega 6 eventos puntuables',
    family: 'attendance',
    counter: 'played',
    target: 6,
  },
  {
    id: 'persist',
    name: 'Persist',
    description: 'Juega 15 eventos puntuables',
    family: 'attendance',
    counter: 'played',
    target: 15,
  },
  {
    id: 'saga',
    name: 'Saga',
    description: 'Juega 30 eventos puntuables',
    family: 'attendance',
    counter: 'played',
    target: 30,
  },
  {
    id: 'ferocious',
    name: 'Ferocious',
    description: 'Termina 4 veces en el Top 4 (mínimo 8 jugadores)',
    family: 'top4',
    counter: 'topFour',
    target: 4,
  },
  {
    id: 'citys-blessing',
    name: "City's Blessing",
    description: 'Termina 10 veces en el Top 4 (mínimo 8 jugadores)',
    family: 'top4',
    counter: 'topFour',
    target: 10,
  },
  {
    id: 'prowess',
    name: 'Prowess',
    description: 'Termina 3 veces seguidas en el Top 4',
    family: 'top4',
    counter: 'topFourStreak',
    target: 3,
  },
  {
    id: 'storm',
    name: 'Storm',
    description: 'Termina 6 veces seguidas en el Top 4',
    family: 'top4',
    counter: 'topFourStreak',
    target: 6,
  },
  {
    id: 'deathtouch',
    name: 'Deathtouch',
    description: 'Gana 3 eventos puntuables',
    family: 'titles',
    counter: 'titles',
    target: 3,
  },
  {
    id: 'annihilator',
    name: 'Annihilator',
    description: 'Gana 6 eventos puntuables',
    family: 'titles',
    counter: 'titles',
    target: 6,
  },
  {
    id: 'legendary',
    name: 'Legendary',
    description: 'Gana 10 eventos puntuables',
    family: 'titles',
    counter: 'titles',
    target: 10,
  },
  {
    id: 'delirium',
    name: 'Delirium',
    description: 'Puntúa en 4 formatos distintos',
    family: 'formats',
    counter: 'formats',
    target: 4,
  },
  {
    id: 'domain',
    name: 'Domain',
    description: 'Puntúa en 5 formatos distintos',
    family: 'formats',
    counter: 'formats',
    target: 5,
  },
  {
    id: 'changeling',
    name: 'Changeling',
    description: 'Gana eventos en 2 formatos distintos',
    family: 'formats',
    counter: 'titleFormats',
    target: 2,
  },
  {
    id: 'melee',
    name: 'Melee',
    description: 'Gana un evento de 24 jugadores o más',
    family: 'field',
    counter: 'bigWins',
    target: 1,
  },
  {
    id: 'paragon',
    name: 'Paragon',
    description: 'Acaba entre los tres primeros de la clasificación final',
    family: 'season',
    finalRank: 3,
  },
  {
    id: 'monarch',
    name: 'Monarch',
    description: 'Acaba primero de la clasificación final',
    family: 'season',
    finalRank: 1,
  },
]

/**
 * A Top 4 only means something once it is not most of the room: a four player
 * draft or a six player evening says nothing about how well anyone finished.
 * Events below this size are left out of the Top 4 count entirely, so playing
 * one never breaks a streak either.
 */
const RANKED_FIELD = 8

/** Field size from which winning an event says something on its own. */
const CROWDED_FIELD = 24

type BadgeCounters = Record<BadgeCounter, number>

type MemberProgress = {
  counters: BadgeCounters
  /**
   * Top 4 finishes in a row. Only the member's own results move it, so an
   * event they did not enter never breaks a streak: missing a week is not a
   * bad result, and a badge must not punish a life that got in the way.
   */
  runningTopFour: number
  unlockedAt: Map<string, string>
}

function createProgress(): MemberProgress {
  return {
    counters: {
      played: 0,
      topFour: 0,
      topFourStreak: 0,
      titles: 0,
      formats: 0,
      titleFormats: 0,
      bigWins: 0,
    },
    runningTopFour: 0,
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
  const titleFormatsByMember = new Map<string, Set<string>>()
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
      const titleFormats =
        titleFormatsByMember.get(entry.memberId) ?? new Set<string>()

      progressByMember.set(entry.memberId, progress)
      formatsByMember.set(entry.memberId, formats)
      titleFormatsByMember.set(entry.memberId, titleFormats)
      formats.add(item.format.id)
      const wonTheEvent = entry.rank === 1

      if (wonTheEvent) {
        titleFormats.add(item.format.id)
      }

      const field = item.standing.entries.length

      progress.counters.played += 1
      progress.counters.titles += Number(wonTheEvent)
      progress.counters.bigWins += Number(wonTheEvent && field >= CROWDED_FIELD)
      progress.counters.formats = formats.size
      progress.counters.titleFormats = titleFormats.size

      if (field >= RANKED_FIELD) {
        const reachedTopFour = entry.rank <= 4

        progress.counters.topFour += Number(reachedTopFour)
        progress.runningTopFour = reachedTopFour
          ? progress.runningTopFour + 1
          : 0
        progress.counters.topFourStreak = Math.max(
          progress.counters.topFourStreak,
          progress.runningTopFour,
        )
      }

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
