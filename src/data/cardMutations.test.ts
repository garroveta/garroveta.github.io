import { describe, expect, it } from 'vitest'

import { importWantedCards, publishMarketplaceListing } from './cardMutations'
import { demoData } from './demoData'

describe('card mutations', () => {
  it('publishes a marketplace listing for an approved member', () => {
    const updatedData = publishMarketplaceListing(demoData, {
      memberId: demoData.currentMemberId,
      cardId: 'card-esper-sentinel',
      quantity: 2,
      language: 'es',
      condition: 'near_mint',
      finish: 'nonfoil',
      offerType: 'trade',
    })

    expect(updatedData.listings.at(-1)).toMatchObject({
      id: 'listing-alex-esper-sentinel',
      cardId: 'card-esper-sentinel',
      memberId: demoData.currentMemberId,
      quantity: 2,
      offerType: 'trade',
      status: 'available',
    })
  })

  it('imports recognized wanted cards and reports unknown lines', () => {
    const result = importWantedCards(
      demoData,
      demoData.currentMemberId,
      '2x Rhystic Study\nEsper Sentinel x3\nCarta desconocida',
    )

    expect(result.imported).toEqual([
      {
        cardId: 'card-rhystic-study',
        cardName: 'Rhystic Study',
        quantity: 2,
      },
      {
        cardId: 'card-esper-sentinel',
        cardName: 'Esper Sentinel',
        quantity: 3,
      },
    ])
    expect(result.unknownLines).toEqual(['Carta desconocida'])
    expect(
      result.data.wantedCards.find(
        ({ id }) => id === 'wanted-alex-rhystic-study',
      ),
    ).toMatchObject({ quantity: 2, status: 'active' })
    expect(
      result.data.cardMatches.find(
        ({ wantedCardId }) => wantedCardId === 'wanted-alex-rhystic-study',
      ),
    ).toMatchObject({
      listingId: 'listing-rhystic-study',
      status: 'new',
    })
  })

  it('adds imported quantities to an existing active search', () => {
    const result = importWantedCards(
      demoData,
      demoData.currentMemberId,
      '2 Sol Ring',
    )

    expect(
      result.data.wantedCards.find(({ id }) => id === 'wanted-alex-sol-ring')
        ?.quantity,
    ).toBe(3)
  })
})
