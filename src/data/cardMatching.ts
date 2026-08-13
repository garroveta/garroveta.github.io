import type { Card, CardMatch, DemoDataSet } from '../domain/types'
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

function normalizeCardName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('en')
}

function cardsMatch(
  wantedCard: DemoDataSet['wantedCards'][number],
  wantedPrinting: Card | undefined,
  listingPrinting: Card | undefined,
) {
  if (!wantedPrinting || !listingPrinting) {
    return false
  }

  if (!wantedCard.matchAllPrintings) {
    return wantedPrinting.id === listingPrinting.id
  }

  if (wantedCard.oracleId && listingPrinting.oracleId) {
    return wantedCard.oracleId === listingPrinting.oracleId
  }

  return (
    normalizeCardName(wantedPrinting.name) ===
    normalizeCardName(listingPrinting.name)
  )
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
  const cardMatches: CardMatch[] = data.cardMatches.filter(
    ({ status }) => status === 'completed',
  )
  const cardsById = new Map(data.cards.map((card) => [card.id, card]))

  for (const wantedCard of data.wantedCards) {
    if (wantedCard.status !== 'active') {
      continue
    }

    for (const listing of data.listings) {
      const wantedPrinting = cardsById.get(wantedCard.cardId)
      const listingPrinting = cardsById.get(listing.cardId)

      if (
        listing.status !== 'available' ||
        listing.memberId === wantedCard.memberId ||
        !cardsMatch(wantedCard, wantedPrinting, listingPrinting) ||
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
