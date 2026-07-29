import type {
  DemoDataSet,
  MarketplaceListing,
  WantedCard,
} from '../domain/types'
import { synchronizeCardMatches } from './cardMatching'

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
      candidate.id === listingId ? { ...candidate, status } : candidate,
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
