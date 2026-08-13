import type {
  DemoDataSet,
  MarketplaceListing,
  WantedCard,
} from '../domain/types'
import { synchronizeCardMatches } from './cardMatching'
import { DEMO_REFERENCE_TIME } from './dashboardSelectors'

export function updateMarketplaceListingStatus(
  data: DemoDataSet,
  listingId: string,
  memberId: string,
  status: MarketplaceListing['status'],
): DemoDataSet {
  const listing = data.listings.find(
    (candidate) =>
      candidate.id === listingId && candidate.memberId === memberId,
  )

  if (!listing || listing.status === status) {
    return data
  }

  return synchronizeCardMatches({
    ...data,
    listings: data.listings.map((candidate) =>
      candidate.id === listingId
        ? {
            ...candidate,
            status,
            reservedByMemberId:
              status === 'reserved' ? candidate.reservedByMemberId : undefined,
            reservedAt:
              status === 'reserved' ? candidate.reservedAt : undefined,
          }
        : candidate,
    ),
  })
}

export function reserveMarketplaceListing(
  data: DemoDataSet,
  listingId: string,
  memberId: string,
  reservedAt = DEMO_REFERENCE_TIME,
): DemoDataSet {
  const member = data.members.find(({ id }) => id === memberId)
  const listing = data.listings.find(({ id }) => id === listingId)

  if (
    !member ||
    member.status !== 'approved' ||
    !listing ||
    listing.status !== 'available' ||
    listing.memberId === memberId
  ) {
    return data
  }

  return synchronizeCardMatches({
    ...data,
    listings: data.listings.map((candidate) =>
      candidate.id === listingId
        ? {
            ...candidate,
            status: 'reserved' as const,
            reservedByMemberId: memberId,
            reservedAt,
          }
        : candidate,
    ),
  })
}

export function updateWantedCardStatus(
  data: DemoDataSet,
  wantedCardId: string,
  memberId: string,
  status: WantedCard['status'],
): DemoDataSet {
  const wantedCard = data.wantedCards.find(
    (candidate) =>
      candidate.id === wantedCardId && candidate.memberId === memberId,
  )

  if (!wantedCard || wantedCard.status === status) {
    return data
  }

  return synchronizeCardMatches({
    ...data,
    wantedCards: data.wantedCards.map((candidate) =>
      candidate.id === wantedCardId ? { ...candidate, status } : candidate,
    ),
  })
}

export function markCardMatchSeen(
  data: DemoDataSet,
  matchId: string,
  memberId: string,
): DemoDataSet {
  const match = data.cardMatches.find(
    (candidate) =>
      candidate.id === matchId && candidate.buyerMemberId === memberId,
  )

  if (!match || match.status !== 'new') {
    return data
  }

  return {
    ...data,
    cardMatches: data.cardMatches.map((candidate) =>
      candidate.id === matchId
        ? { ...candidate, status: 'seen' as const }
        : candidate,
    ),
  }
}
