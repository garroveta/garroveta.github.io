import type {
  Card,
  CardMatch,
  CommunityEvent,
  CommunityGame,
  CommunityMember,
  CommunityRankingSeason,
  DemoDataSet,
  EventRegistration,
  MarketplaceListing,
  NewsPost,
} from '../domain/types'
import {
  getCommunityLeaderboard,
  type CommunityRankingPlayer,
} from './rankingSelectors'

export const DEMO_REFERENCE_TIME = '2026-07-29T12:00:00+02:00'

export type DashboardEvent = {
  event: CommunityEvent
  game?: CommunityGame
  registration?: EventRegistration
}

export type DashboardMatch = {
  match: CardMatch
  listing: MarketplaceListing
  card: Card
  seller: CommunityMember
}

export type RankingHighlight = {
  season?: CommunityRankingSeason
  ranking?: CommunityRankingPlayer
}

export type PlayerDashboard = {
  nextEvent?: DashboardEvent
  highlightedNews?: NewsPost
  newMatches: DashboardMatch[]
  rankingHighlight?: RankingHighlight
}

export type ManagerDashboardEvent = {
  event: CommunityEvent
  game?: CommunityGame
  occupancyRate: number
}

export type ManagerDashboard = {
  upcomingEvents: ManagerDashboardEvent[]
  pendingMembers: CommunityMember[]
  totalWaitlisted: number
  fullEvents: number
  attentionEvents: ManagerDashboardEvent[]
}

function byMostRecent(
  first: { createdAt: string },
  second: { createdAt: string },
) {
  return (
    new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  )
}

/**
 * Card matches still live in the local prototype dataset, so they must be read
 * from it: the community member feed of a connected account does not hold the
 * prototype sellers, and looking them up there silently drops every match.
 */
export function getMemberNewCardMatches(
  data: DemoDataSet,
  memberId: string,
): DashboardMatch[] {
  return data.cardMatches
    .filter(
      ({ buyerMemberId, status }) =>
        buyerMemberId === memberId && status === 'new',
    )
    .sort(byMostRecent)
    .flatMap((match) => {
      const listing = data.listings.find(({ id }) => id === match.listingId)
      const card = listing
        ? data.cards.find(({ id }) => id === listing.cardId)
        : undefined
      const seller = data.members.find(({ id }) => id === match.sellerMemberId)

      return listing && card && seller ? [{ match, listing, card, seller }] : []
    })
}

export function getPlayerDashboard(
  data: DemoDataSet,
  member: CommunityMember,
  rankingMemberId: string = member.id,
  referenceTime = DEMO_REFERENCE_TIME,
): PlayerDashboard {
  const memberId = member.id
  const referenceTimestamp = new Date(referenceTime).getTime()
  const favoriteGameIds = new Set(member.favoriteGameIds)
  const nextEvent = data.events
    .filter(
      (event) =>
        event.status !== 'completed' &&
        new Date(event.startsAt).getTime() >= referenceTimestamp &&
        (favoriteGameIds.size === 0 ||
          (event.gameId ? favoriteGameIds.has(event.gameId) : false)),
    )
    .sort(
      (first, second) =>
        new Date(first.startsAt).getTime() -
        new Date(second.startsAt).getTime(),
    )[0]

  const nextEventRegistration = nextEvent
    ? data.registrations.find(
        ({ eventId, memberId: registrationMemberId }) =>
          eventId === nextEvent.id && registrationMemberId === memberId,
      )
    : undefined

  const highlightedNews = data.newsPosts
    .filter(
      ({ tagIds }) =>
        tagIds.length === 0 ||
        tagIds.some((tagId) => member.tagIds.includes(tagId)),
    )
    .sort(
      (first, second) =>
        Number(second.pinned) - Number(first.pinned) ||
        new Date(second.publishedAt).getTime() -
          new Date(first.publishedAt).getTime(),
    )[0]

  const newMatches = getMemberNewCardMatches(data, memberId)

  const followsMtg =
    favoriteGameIds.size === 0 || favoriteGameIds.has('game-mtg')
  const rankingSeason = followsMtg
    ? (data.rankingSeasons.find(({ status }) => status === 'active') ??
      data.rankingSeasons.find(({ status }) => status !== 'upcoming'))
    : undefined

  return {
    nextEvent: nextEvent
      ? {
          event: nextEvent,
          game: nextEvent.gameId
            ? data.games.find(({ id }) => id === nextEvent.gameId)
            : undefined,
          registration: nextEventRegistration,
        }
      : undefined,
    highlightedNews,
    newMatches,
    rankingHighlight: followsMtg
      ? {
          season: rankingSeason,
          ranking: rankingSeason
            ? getCommunityLeaderboard(data, {
                gameId: 'game-mtg',
                seasonId: rankingSeason.id,
              }).find(
                ({ member: rankedMember }) =>
                  rankedMember.id === rankingMemberId,
              )
            : undefined,
        }
      : undefined,
  }
}

export function getManagerDashboard(
  data: DemoDataSet,
  referenceTime = DEMO_REFERENCE_TIME,
): ManagerDashboard {
  const referenceTimestamp = new Date(referenceTime).getTime()
  const gamesById = new Map(data.games.map((game) => [game.id, game]))
  const upcomingEvents = data.events
    .filter(
      (event) =>
        event.status !== 'completed' &&
        new Date(event.startsAt).getTime() >= referenceTimestamp,
    )
    .sort(
      (first, second) =>
        new Date(first.startsAt).getTime() -
        new Date(second.startsAt).getTime(),
    )
    .map((event) => ({
      event,
      game: event.gameId ? gamesById.get(event.gameId) : undefined,
      occupancyRate:
        event.registrationEnabled && event.capacity > 0
          ? Math.min(
              100,
              Math.round(
                (event.registrationSummary.confirmed / event.capacity) * 100,
              ),
            )
          : 0,
    }))
  const attentionEvents = upcomingEvents.filter(
    ({ event, occupancyRate }) =>
      event.registrationEnabled &&
      (event.registrationSummary.waitlisted > 0 || occupancyRate >= 90),
  )

  return {
    upcomingEvents,
    pendingMembers: data.members
      .filter(({ status }) => status === 'pending')
      .sort((first, second) =>
        first.displayName.localeCompare(second.displayName),
      ),
    totalWaitlisted: upcomingEvents.reduce(
      (total, { event }) =>
        total +
        (event.registrationEnabled ? event.registrationSummary.waitlisted : 0),
      0,
    ),
    fullEvents: upcomingEvents.filter(
      ({ event }) =>
        event.registrationEnabled &&
        event.registrationSummary.confirmed >= event.capacity,
    ).length,
    attentionEvents,
  }
}
