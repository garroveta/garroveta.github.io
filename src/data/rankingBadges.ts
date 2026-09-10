import type {
  CommunityBadgeSettings,
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
  /** The Magic rule the name comes from, in Spanish. Not configurable. */
  reference: string
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

/** A definition with the sentence describing its current threshold. */
export type ResolvedBadge = BadgeDefinition & { description: string }

export type MemberBadge = {
  definition: ResolvedBadge
  unlockedAt?: string
  progress?: { current: number; target: number }
}

export type BadgeHolder = {
  member: CommunityMember
  unlockedAt: string
}

export type SeasonBadge = {
  definition: ResolvedBadge
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
    reference: 'Vigilancia: atacar no hace que la criatura se gire.',
    family: 'attendance',
    counter: 'played',
    target: 6,
  },
  {
    id: 'persist',
    name: 'Persist',
    reference:
      'Persistir: al morir sin contadores -1/-1, vuelve al campo de batalla con uno.',
    family: 'attendance',
    counter: 'played',
    target: 15,
  },
  {
    id: 'saga',
    name: 'Saga',
    reference:
      'Saga: un encantamiento que cuenta su historia por capítulos, un contador por turno.',
    family: 'attendance',
    counter: 'played',
    target: 30,
  },
  {
    id: 'ferocious',
    name: 'Ferocious',
    reference:
      'Ferocidad: se activa si controlas una criatura con fuerza 4 o más.',
    family: 'top4',
    counter: 'topFour',
    target: 4,
  },
  {
    id: 'citys-blessing',
    name: "City's Blessing",
    reference:
      'La bendición de la ciudad: la obtienes al ascender, con diez o más permanentes.',
    family: 'top4',
    counter: 'topFour',
    target: 10,
  },
  {
    id: 'prowess',
    name: 'Prowess',
    reference:
      'Destreza: cada hechizo que no sea de criatura le da +1/+1 hasta el final del turno.',
    family: 'top4',
    counter: 'topFourStreak',
    target: 3,
  },
  {
    id: 'storm',
    name: 'Storm',
    reference:
      'Tormenta: el hechizo se copia por cada hechizo lanzado antes que él este turno.',
    family: 'top4',
    counter: 'topFourStreak',
    target: 6,
  },
  {
    id: 'deathtouch',
    name: 'Deathtouch',
    reference:
      'Toque mortal: cualquier daño que inflija a una criatura basta para destruirla.',
    family: 'titles',
    counter: 'titles',
    target: 3,
  },
  {
    id: 'annihilator',
    name: 'Annihilator',
    reference:
      'Aniquilador: al atacar, el defensor sacrifica esa cantidad de permanentes.',
    family: 'titles',
    counter: 'titles',
    target: 6,
  },
  {
    id: 'legendary',
    name: 'Legendary',
    reference:
      'Legendaria: solo puedes controlar una carta legendaria con el mismo nombre.',
    family: 'titles',
    counter: 'titles',
    target: 10,
  },
  {
    id: 'delirium',
    name: 'Delirium',
    reference:
      'Delirio: se activa con cuatro o más tipos de carta en tu cementerio.',
    family: 'formats',
    counter: 'formats',
    target: 4,
  },
  {
    id: 'domain',
    name: 'Domain',
    reference:
      'Dominio: cuenta los tipos de tierra básica que controlas, hasta cinco.',
    family: 'formats',
    counter: 'formats',
    target: 5,
  },
  {
    id: 'changeling',
    name: 'Changeling',
    reference:
      'Cambiaformas: la carta es de todos los tipos de criatura a la vez.',
    family: 'formats',
    counter: 'titleFormats',
    target: 2,
  },
  {
    id: 'melee',
    name: 'Melee',
    reference:
      'Cuerpo a cuerpo: +1/+1 por cada oponente al que hayas atacado este turno.',
    family: 'field',
    counter: 'bigWins',
    target: 1,
  },
  {
    id: 'paragon',
    name: 'Paragon',
    reference:
      'Paragon no es una habilidad: son las criaturas que refuerzan a las de su tipo.',
    family: 'season',
    finalRank: 3,
  },
  {
    id: 'monarch',
    name: 'Monarch',
    reference:
      'El monarca: robas una carta cada turno hasta que alguien te inflija daño de combate.',
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

function countOf(value: number, one: string, many: string) {
  return `${value} ${value === 1 ? one : many}`
}

/**
 * The sentence a badge shows is derived from its counter and its threshold, so
 * a manager who raises a target can never leave a description behind claiming
 * the old one.
 */
function describeBadge({ counter, target, finalRank }: BadgeDefinition) {
  if (finalRank !== undefined) {
    return finalRank === 1
      ? 'Acaba primero de la clasificación final'
      : `Acaba entre los ${finalRank} primeros de la clasificación final`
  }

  const value = target ?? 0

  switch (counter) {
    case 'played':
      return `Juega ${countOf(value, 'evento puntuable', 'eventos puntuables')}`
    case 'topFour':
      return `Termina ${countOf(value, 'vez', 'veces')} en el Top 4 (mínimo ${RANKED_FIELD} jugadores)`
    case 'topFourStreak':
      return `Termina ${value} ${value === 1 ? 'vez seguida' : 'veces seguidas'} en el Top 4`
    case 'titles':
      return `Gana ${countOf(value, 'evento puntuable', 'eventos puntuables')}`
    case 'formats':
      return `Puntúa en ${countOf(value, 'formato distinto', 'formatos distintos')}`
    case 'titleFormats':
      return `Gana eventos en ${countOf(value, 'formato distinto', 'formatos distintos')}`
    case 'bigWins':
      return `Gana ${value === 1 ? 'un evento' : `${value} eventos`} de ${CROWDED_FIELD} jugadores o más`
    default:
      return ''
  }
}

/** The catalogue as shipped, the starting point a community can adjust. */
export function getDefaultBadgeSettings(): CommunityBadgeSettings {
  return {
    badges: SEASON_BADGES.map(({ id, name, target }) =>
      target === undefined ? { id, name } : { id, name, target },
    ),
  }
}

/**
 * Merges the community settings over the catalogue shipped in code: a badge
 * added later appears on its own, and a setting left over from a badge that no
 * longer exists is ignored rather than resurrecting it.
 */
export function resolveSeasonBadges(
  settings?: CommunityBadgeSettings,
): ResolvedBadge[] {
  const overrides = new Map(
    (settings?.badges ?? []).map((badge) => [badge.id, badge]),
  )

  return SEASON_BADGES.map((definition) => {
    const override = overrides.get(definition.id)
    const resolved: BadgeDefinition = override
      ? {
          ...definition,
          name: override.name.trim() || definition.name,
          ...(definition.counter !== undefined && override.target !== undefined
            ? { target: override.target }
            : {}),
        }
      : definition

    return { ...resolved, description: describeBadge(resolved) }
  })
}

function badgesForSeason(data: DemoDataSet, season: CommunityRankingSeason) {
  return resolveSeasonBadges(
    season.badges ? { badges: season.badges } : data.badgeSettings,
  )
}

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
  badges: ResolvedBadge[],
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

      for (const badge of badges) {
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

      for (const badge of badges) {
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

  const badges = badgesForSeason(data, season)
  const progressByMember = collectProgress(data, scope, season, badges)
  const membersById = new Map(data.members.map((member) => [member.id, member]))

  return {
    season,
    players: progressByMember.size,
    badges: badges.map((definition) => ({
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

  const badges = badgesForSeason(data, season)
  const progress = collectProgress(data, scope, season, badges).get(memberId)

  return badges.map((definition) => ({
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
