import type {
  Card,
  CardMatch,
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

export type MemberMarketplaceListingItem = {
  listing: MarketplaceListing
  card: Card
}

export type MemberCardMatchItem = {
  match: CardMatch
  card: Card
  listing: MarketplaceListing
  wantedCard: WantedCard
  seller: CommunityMember
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

export function getMemberMarketplaceListings(
  data: DemoDataSet,
  memberId: string,
): MemberMarketplaceListingItem[] {
  return data.listings
    .filter(({ memberId: listingMemberId }) => listingMemberId === memberId)
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    )
    .flatMap((listing) => {
      const card = data.cards.find(({ id }) => id === listing.cardId)
      return card ? [{ listing, card }] : []
    })
}

export function getMemberCardMatches(
  data: DemoDataSet,
  memberId: string,
): MemberCardMatchItem[] {
  const statusOrder: Record<CardMatch['status'], number> = {
    new: 0,
    seen: 1,
    contacted: 2,
  }

  return data.cardMatches
    .filter(({ buyerMemberId }) => buyerMemberId === memberId)
    .sort(
      (first, second) =>
        statusOrder[first.status] - statusOrder[second.status] ||
        new Date(second.createdAt).getTime() -
          new Date(first.createdAt).getTime(),
    )
    .flatMap((match) => {
      const listing = data.listings.find(({ id }) => id === match.listingId)
      const wantedCard = data.wantedCards.find(
        ({ id }) => id === match.wantedCardId,
      )
      const card = listing
        ? data.cards.find(({ id }) => id === listing.cardId)
        : undefined
      const seller = data.members.find(({ id }) => id === match.sellerMemberId)

      return listing && wantedCard && card && seller
        ? [{ match, listing, wantedCard, card, seller }]
        : []
    })
}
