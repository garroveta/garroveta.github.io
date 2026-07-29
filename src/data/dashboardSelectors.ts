import type {
  Card,
  CardMatch,
  CommunityEvent,
  CommunityMember,
  DemoDataSet,
  EventRegistration,
  MarketplaceListing,
  NewsPost,
} from '../domain/types'

export const DEMO_REFERENCE_TIME = '2026-07-29T12:00:00+02:00'

export type DashboardEvent = {
  event: CommunityEvent
  registration?: EventRegistration
}

export type DashboardMatch = {
  match: CardMatch
  listing: MarketplaceListing
  card: Card
  seller: CommunityMember
}

export type PlayerDashboard = {
  nextEvent?: DashboardEvent
  highlightedNews?: NewsPost
  newMatches: DashboardMatch[]
}

function byMostRecent(
  first: { createdAt: string },
  second: { createdAt: string },
) {
  return (
    new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  )
}

export function getPlayerDashboard(
  data: DemoDataSet,
  memberId: string,
  referenceTime = DEMO_REFERENCE_TIME,
): PlayerDashboard {
  const member = data.members.find(({ id }) => id === memberId)

  if (!member) {
    throw new Error('No se ha encontrado el jugador del panel.')
  }

  const referenceTimestamp = new Date(referenceTime).getTime()
  const nextEvent = data.events
    .filter(
      (event) =>
        event.status !== 'completed' &&
        new Date(event.startsAt).getTime() >= referenceTimestamp,
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

  const newMatches = data.cardMatches
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

  return {
    nextEvent: nextEvent
      ? {
          event: nextEvent,
          registration: nextEventRegistration,
        }
      : undefined,
    highlightedNews,
    newMatches,
  }
}
