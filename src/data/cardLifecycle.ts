import type {
  CardCondition,
  CardLanguage,
  DemoDataSet,
  MarketplaceListing,
  WantedCard,
} from '../domain/types'
import { synchronizeCardMatches } from './cardMatching'
import { DEMO_REFERENCE_TIME } from './dashboardSelectors'

export type MarketplaceListingDetails = {
  quantity: number
  language: CardLanguage
  condition: CardCondition
  finish: MarketplaceListing['finish']
  priceEur?: number
}

export type WantedCardDetails = {
  quantity: number
  acceptedLanguages: CardLanguage[]
  acceptedFinishes: MarketplaceListing['finish'][]
}

export function updateMarketplaceListingDetails(
  data: DemoDataSet,
  listingId: string,
  memberId: string,
  details: MarketplaceListingDetails,
): DemoDataSet {
  const listing = data.listings.find(
    (candidate) =>
      candidate.id === listingId && candidate.memberId === memberId,
  )
  const quantity = Math.floor(details.quantity)
  const priceEur =
    details.priceEur && details.priceEur > 0
      ? Math.round(details.priceEur * 100) / 100
      : undefined

  if (!listing || listing.status === 'completed' || quantity < 1) {
    return data
  }

  return synchronizeCardMatches({
    ...data,
    listings: data.listings.map((candidate) =>
      candidate.id === listingId
        ? {
            ...candidate,
            quantity,
            language: details.language,
            condition: details.condition,
            finish: details.finish,
            priceEur,
          }
        : candidate,
    ),
  })
}

export function updateWantedCardDetails(
  data: DemoDataSet,
  wantedCardId: string,
  memberId: string,
  details: WantedCardDetails,
): DemoDataSet {
  const wantedCard = data.wantedCards.find(
    (candidate) =>
      candidate.id === wantedCardId && candidate.memberId === memberId,
  )
  const quantity = Math.floor(details.quantity)

  if (
    !wantedCard ||
    wantedCard.status === 'fulfilled' ||
    quantity < 1 ||
    details.acceptedLanguages.length === 0 ||
    details.acceptedFinishes.length === 0
  ) {
    return data
  }

  return synchronizeCardMatches({
    ...data,
    wantedCards: data.wantedCards.map((candidate) =>
      candidate.id === wantedCardId
        ? {
            ...candidate,
            quantity,
            acceptedLanguages: [...new Set(details.acceptedLanguages)],
            acceptedFinishes: [...new Set(details.acceptedFinishes)],
          }
        : candidate,
    ),
  })
}

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

export function cancelMarketplaceReservation(
  data: DemoDataSet,
  listingId: string,
  memberId: string,
): DemoDataSet {
  const listing = data.listings.find(({ id }) => id === listingId)

  if (
    !listing ||
    listing.status !== 'reserved' ||
    (listing.memberId !== memberId && listing.reservedByMemberId !== memberId)
  ) {
    return data
  }

  return synchronizeCardMatches({
    ...data,
    listings: data.listings.map((candidate) =>
      candidate.id === listingId
        ? {
            ...candidate,
            status: 'available' as const,
            reservedByMemberId: undefined,
            reservedAt: undefined,
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
