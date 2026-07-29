import { describe, expect, it } from 'vitest'

import { importWantedCards } from './cardMutations'
import { synchronizeCardMatches } from './cardMatching'
import { demoData } from './demoData'

describe('card matching', () => {
  it('preserves the existing compatible matches and their statuses', () => {
    const synchronizedData = synchronizeCardMatches(demoData)

    expect(synchronizedData.cardMatches).toEqual(demoData.cardMatches)
  })

  it('creates a new match after importing a compatible search', () => {
    const importedData = importWantedCards(
      demoData,
      demoData.currentMemberId,
      'Rhystic Study',
    ).data
    const synchronizedData = synchronizeCardMatches(importedData)
    const newMatch = synchronizedData.cardMatches.find(
      ({ wantedCardId }) => wantedCardId === 'wanted-alex-rhystic-study',
    )

    expect(newMatch).toMatchObject({
      listingId: 'listing-rhystic-study',
      buyerMemberId: demoData.currentMemberId,
      sellerMemberId: 'member-marta',
      score: 100,
      status: 'new',
    })
  })

  it('ignores offers from the same member and incompatible finishes', () => {
    const modifiedData = structuredClone(demoData)
    modifiedData.wantedCards.push({
      id: 'wanted-alex-lightning-bolt-foil',
      communityId: demoData.community.id,
      memberId: demoData.currentMemberId,
      cardId: 'card-lightning-bolt',
      quantity: 1,
      acceptedLanguages: ['en'],
      acceptedFinishes: ['foil'],
      status: 'active',
      createdAt: '2026-07-29T10:00:00+02:00',
    })

    expect(
      synchronizeCardMatches(modifiedData).cardMatches.some(
        ({ wantedCardId }) =>
          wantedCardId === 'wanted-alex-lightning-bolt-foil',
      ),
    ).toBe(false)
  })
})
