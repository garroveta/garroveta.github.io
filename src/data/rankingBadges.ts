import {
  CROWDED_FIELD,
  RANKED_FIELD,
  getBadgeLadders,
  resolveSeasonBadges,
  type BadgeCounter,
  type BadgeTier,
  type ResolvedBadge,
} from '../domain/badges'
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

export type BadgeScope = {
  gameId: string
  seasonId: string
}

export type MemberBadge = {
  definition: ResolvedBadge
  unlockedAt?: string
  progress?: { current: number; target: number }
  /**
   * Where the member stands right now on a badge the closing decides. Never
   * an unlock: the season can still take it back, and only `unlockedAt` ever
   * means the badge is theirs.
   */
  standing?: { currentRank: number; rankedPlayers: number; held: boolean }
}

export type MemberLadderStep = MemberBadge & { tier: BadgeTier }

export type MemberBadgeLadder = {
  id: string
  label: string
  steps: MemberLadderStep[]
  /** The rung to aim at next, absent once every rung is held. */
  next?: MemberLadderStep
}

export type BadgeHolder = {
  member: CommunityMember
  unlockedAt: string
  /** Absent for the badges the closing decides, which no event unlocks. */
  eventId?: string
}

export type BadgeUnlock = {
  definition: ResolvedBadge
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

function badgesForSeason(data: DemoDataSet, season: CommunityRankingSeason) {
  return resolveSeasonBadges(
    season.badges ? { badges: season.badges } : data.badgeSettings,
  )
}

type BadgeCounters = Record<BadgeCounter, number>

type UnlockRecord = {
  at: string
  eventId?: string
}

type MemberProgress = {
  counters: BadgeCounters
  /**
   * Top 4 finishes in a row. Only the member's own results move it, so an
   * event they did not enter never breaks a streak: missing a week is not a
   * bad result, and a badge must not punish a life that got in the way.
   */
  runningTopFour: number
  unlockedAt: Map<string, UnlockRecord>
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
          progress.unlockedAt.set(badge.id, {
            at: playedAt,
            eventId: item.event.id,
          })
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
          progress.unlockedAt.set(badge.id, { at: season.endsOn })
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
          const unlock = progress.unlockedAt.get(definition.id)

          return member && unlock
            ? [{ member, unlockedAt: unlock.at, eventId: unlock.eventId }]
            : []
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
  // A season still running has a live leaderboard: a badge decided at the
  // closing can at least say where the member stands on it today.
  const leaderboard =
    season.status === 'closed' ? [] : getCommunityLeaderboard(data, scope)
  const currentRank = leaderboard.find(
    ({ member }) => member.id === memberId,
  )?.rank

  return badges.map((definition) => ({
    definition,
    unlockedAt: progress?.unlockedAt.get(definition.id)?.at,
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
    standing:
      definition.finalRank !== undefined && currentRank !== undefined
        ? {
            currentRank,
            rankedPlayers: leaderboard.length,
            held: currentRank <= definition.finalRank,
          }
        : undefined,
  }))
}

/**
 * The badges an event handed out, in the order the standings rank their
 * holders. Sharing a result is the moment these are worth telling, so they are
 * read from the same unlock records rather than recomputed from dates.
 */
export function getBadgeUnlocksForEvent(
  data: DemoDataSet,
  scope: BadgeScope,
  eventId: string,
): BadgeUnlock[] {
  const board = getSeasonBadgeBoard(data, scope)

  if (!board) {
    return []
  }

  return board.badges.flatMap(({ definition, holders }) =>
    holders
      .filter((holder) => holder.eventId === eventId)
      .map(({ member, unlockedAt }) => ({ definition, member, unlockedAt })),
  )
}

/**
 * One member's badges as ladders rather than as a flat list, with the rung
 * they are climbing towards singled out. A member does not need to read
 * sixteen locked badges: they need the next step of each thing they are
 * already doing.
 */
export function getMemberBadgeLadders(
  memberBadges: MemberBadge[],
): MemberBadgeLadder[] {
  const byId = new Map(
    memberBadges.map((badge) => [badge.definition.id, badge]),
  )

  return getBadgeLadders(memberBadges.map(({ definition }) => definition)).map(
    ({ id, label, steps }) => {
      const climbed = steps.flatMap(({ badge, tier }) => {
        const memberBadge = byId.get(badge.id)

        return memberBadge ? [{ ...memberBadge, tier }] : []
      })

      // A rung the member provisionally holds is not a target any more, so the
      // ladder points at the one above it. When every rung left is already
      // held provisionally, the top one stays the target: it is a lead to
      // defend until the closing, never a badge won early.
      const pending = climbed.filter(({ unlockedAt }) => !unlockedAt)

      return {
        id,
        label,
        steps: climbed,
        next: pending.find(({ standing }) => !standing?.held) ?? pending.at(-1),
      }
    },
  )
}
