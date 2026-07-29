import type {
  Card,
  CommunityMember,
  DemoDataSet,
  MarketplaceListing,
  WantedCard,
} from '../domain/types'

export type MarketplaceListingItem = {
  listing: MarketplaceListing
  card: Card
  member: CommunityMember
}

export type WantedCardItem = {
  wantedCard: WantedCard
  card: Card
}

export function getMarketplaceListings(
  data: DemoDataSet,
): MarketplaceListingItem[] {
  return data.listings
    .filter(({ status }) => status === 'available')
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    )
    .flatMap((listing) => {
      const card = data.cards.find(({ id }) => id === listing.cardId)
      const member = data.members.find(({ id }) => id === listing.memberId)

      return card && member ? [{ listing, card, member }] : []
    })
}

export function getMemberWantedCards(
  data: DemoDataSet,
  memberId: string,
): WantedCardItem[] {
  return data.wantedCards
    .filter(
      (wantedCard) =>
        wantedCard.memberId === memberId && wantedCard.status !== 'fulfilled',
    )
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    )
    .flatMap((wantedCard) => {
      const card = data.cards.find(({ id }) => id === wantedCard.cardId)
      return card ? [{ wantedCard, card }] : []
    })
}
