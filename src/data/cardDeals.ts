import type { CardDeal, DemoDataSet } from '../domain/types'
import { DEMO_REFERENCE_TIME } from './dashboardSelectors'

export function completeCardDeal(
  data: DemoDataSet,
  matchId: string,
  buyerMemberId: string,
  type: CardDeal['type'],
  completedAt = DEMO_REFERENCE_TIME,
): DemoDataSet {
  const match = data.cardMatches.find(
    (candidate) =>
      candidate.id === matchId && candidate.buyerMemberId === buyerMemberId,
  )
  const listing = match
    ? data.listings.find(({ id }) => id === match.listingId)
    : undefined
  const wantedCard = match
    ? data.wantedCards.find(({ id }) => id === match.wantedCardId)
    : undefined
  const isAllowedType =
    listing?.offerType === 'sale_or_trade' ||
    (listing?.offerType === 'sale' && type === 'sale') ||
    (listing?.offerType === 'trade' && type === 'trade')

  if (
    !match ||
    !listing ||
    !wantedCard ||
    match.status === 'completed' ||
    data.cardDeals.some((deal) => deal.matchId === matchId) ||
    !isAllowedType
  ) {
    return data
  }

  const deal: CardDeal = {
    id: `deal-${match.id.replace('match-', '')}`,
    communityId: data.community.id,
    matchId: match.id,
    wantedCardId: wantedCard.id,
    listingId: listing.id,
    buyerMemberId: match.buyerMemberId,
    sellerMemberId: match.sellerMemberId,
    type,
    completedAt,
  }

  return {
    ...data,
    listings: data.listings.map((candidate) =>
      candidate.id === listing.id
        ? { ...candidate, status: 'completed' as const }
        : candidate,
    ),
    wantedCards: data.wantedCards.map((candidate) =>
      candidate.id === wantedCard.id
        ? { ...candidate, status: 'fulfilled' as const }
        : candidate,
    ),
    cardMatches: data.cardMatches.map((candidate) =>
      candidate.id === match.id
        ? { ...candidate, status: 'completed' as const }
        : candidate,
    ),
    cardDeals: [...data.cardDeals, deal],
  }
}
