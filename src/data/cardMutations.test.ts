import { describe, expect, it } from 'vitest'

import {
  applyResolvedWantedCardImport,
  importWantedCards,
  publishMarketplaceListing,
} from './cardMutations'
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
    })

    expect(updatedData.listings.at(-1)).toMatchObject({
      id: 'listing-alex-esper-sentinel',
      cardId: 'card-esper-sentinel',
      memberId: demoData.currentMemberId,
      quantity: 2,
      offerType: 'sale',
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

  it('updates imported quantities after a resolved Scryfall preview', () => {
    const result = applyResolvedWantedCardImport(
      demoData,
      demoData.currentMemberId,
      [
        {
          item: {
            lineNumber: 1,
            rawLine: '4 Sol Ring (CMM) 410',
            quantity: 4,
            name: 'Sol Ring',
            setCode: 'CMM',
            collectorNumber: '410',
            section: 'main',
          },
          status: 'resolved',
          card: {
            scryfallId: 'sol-ring-scryfall',
            oracleId: 'sol-ring-oracle',
            name: 'Sol Ring',
            setCode: 'CMM',
            setName: 'Commander Masters',
            collectorNumber: '410',
          },
        },
      ],
      'update',
      ['main'],
    )

    expect(
      result.data.wantedCards.find(({ id }) => id === 'wanted-alex-sol-ring'),
    ).toMatchObject({
      quantity: 4,
      oracleId: 'sol-ring-oracle',
      matchAllPrintings: true,
      status: 'active',
    })
  })

  it('pauses absent searches in synchronization mode', () => {
    const resolution = {
      item: {
        lineNumber: 1,
        rawLine: 'Sol Ring',
        quantity: 1,
        name: 'Sol Ring',
        section: 'main' as const,
      },
      status: 'resolved' as const,
      card: {
        scryfallId: 'sol-ring-scryfall',
        oracleId: 'sol-ring-oracle',
        name: 'Sol Ring',
        setCode: 'CMM',
        setName: 'Commander Masters',
        collectorNumber: '410',
      },
    }
    const result = applyResolvedWantedCardImport(
      demoData,
      demoData.currentMemberId,
      [resolution],
      'sync',
      ['main'],
    )

    expect(
      result.data.wantedCards.find(({ id }) => id === 'wanted-alex-one-ring')
        ?.status,
    ).toBe('paused')
  })
})
