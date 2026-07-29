import type { CardMatch, DemoDataSet } from '../domain/types'
import { DEMO_REFERENCE_TIME } from './dashboardSelectors'

function matchKey(wantedCardId: string, listingId: string) {
  return `${wantedCardId}:${listingId}`
}

function createMatchId(
  existingIds: string[],
  wantedCardId: string,
  listingId: string,
) {
  const baseId = `match-${wantedCardId.replace('wanted-', '')}-${listingId.replace('listing-', '')}`
  let candidateId = baseId
  let suffix = 2

  while (existingIds.includes(candidateId)) {
    candidateId = `${baseId}-${suffix}`
    suffix += 1
  }

  return candidateId
}

export function synchronizeCardMatches(
  data: DemoDataSet,
  createdAt = DEMO_REFERENCE_TIME,
): DemoDataSet {
  const existingMatchesByPair = new Map(
    data.cardMatches.map((match) => [
      matchKey(match.wantedCardId, match.listingId),
      match,
    ]),
  )
  const matchIds = data.cardMatches.map(({ id }) => id)
  const cardMatches: CardMatch[] = []

  for (const wantedCard of data.wantedCards) {
    if (wantedCard.status !== 'active') {
      continue
    }

    for (const listing of data.listings) {
      if (
        listing.status !== 'available' ||
        listing.memberId === wantedCard.memberId ||
        listing.cardId !== wantedCard.cardId ||
        !wantedCard.acceptedLanguages.includes(listing.language) ||
        !wantedCard.acceptedFinishes.includes(listing.finish)
      ) {
        continue
      }

      const key = matchKey(wantedCard.id, listing.id)
      const existingMatch = existingMatchesByPair.get(key)

      if (existingMatch) {
        cardMatches.push(existingMatch)
        continue
      }

      const newMatch: CardMatch = {
        id: createMatchId(matchIds, wantedCard.id, listing.id),
        communityId: data.community.id,
        wantedCardId: wantedCard.id,
        listingId: listing.id,
        buyerMemberId: wantedCard.memberId,
        sellerMemberId: listing.memberId,
        score: 100,
        reason: 'Carta, idioma y acabado compatibles.',
        status: 'new',
        createdAt,
      }
      matchIds.push(newMatch.id)
      cardMatches.push(newMatch)
    }
  }

  return {
    ...data,
    cardMatches,
  }
}
