import { describe, expect, it } from 'vitest'

import {
  addWantedCard,
  applyResolvedMarketplaceImport,
  applyResolvedWantedCardImport,
  importWantedCards,
  publishMarketplaceListing,
} from './cardMutations'
import { demoData } from './demoData'

describe('card mutations', () => {
  it('adds a precise wanted-card variant to a private wanted list', () => {
    const updatedData = addWantedCard(demoData, {
      memberId: demoData.currentMemberId,
      cardId: 'card-esper-sentinel',
      cardListId: 'card-list-alex-wanted-pauper',
      quantity: 2,
      acceptedLanguage: 'fr',
      acceptedFinish: 'foil',
    })

    expect(updatedData.wantedCards.at(-1)).toMatchObject({
      cardId: 'card-esper-sentinel',
      memberId: demoData.currentMemberId,
      cardListId: 'card-list-alex-wanted-pauper',
      quantity: 2,
      acceptedLanguages: ['fr'],
      acceptedFinishes: ['foil'],
      matchAllPrintings: false,
      status: 'active',
    })
  })

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
    ).toBeUndefined()
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

  it('applies per-card preferences to imported wanted cards', () => {
    const resolution = {
      item: {
        lineNumber: 1,
        rawLine: '2 Rhystic Study',
        quantity: 2,
        name: 'Rhystic Study',
        section: 'main' as const,
      },
      status: 'resolved' as const,
      card: {
        scryfallId: 'rhystic-study-scryfall',
        oracleId: 'rhystic-study-oracle',
        name: 'Rhystic Study',
        setCode: 'WOT',
        setName: 'Wilds of Eldraine: Enchanting Tales',
        collectorNumber: '25',
      },
    }
    const result = applyResolvedWantedCardImport(
      demoData,
      demoData.currentMemberId,
      [resolution],
      'update',
      ['main'],
      true,
      undefined,
      undefined,
      [
        {
          resolution,
          quantity: 4,
          acceptedLanguages: ['fr'],
          acceptedFinishes: ['foil'],
        },
      ],
    )

    expect(
      result.data.wantedCards.find(
        ({ cardId, memberId }) =>
          cardId === 'card-rhystic-study' &&
          memberId === demoData.currentMemberId,
      ),
    ).toMatchObject({
      quantity: 4,
      acceptedLanguages: ['fr'],
      acceptedFinishes: ['foil'],
    })
  })

  it('keeps separate wanted rows for each language and finish', () => {
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
      [resolution, resolution],
      'add',
      ['main'],
      true,
      undefined,
      undefined,
      [
        {
          resolution,
          quantity: 2,
          acceptedLanguages: ['fr'],
          acceptedFinishes: ['nonfoil'],
        },
        {
          resolution,
          quantity: 3,
          acceptedLanguages: ['fr'],
          acceptedFinishes: ['foil'],
        },
      ],
    )

    const frenchVariants = result.data.wantedCards.filter(
      ({ cardId, memberId, acceptedLanguages }) =>
        cardId === 'card-sol-ring' &&
        memberId === demoData.currentMemberId &&
        acceptedLanguages[0] === 'fr',
    )

    expect(frenchVariants).toHaveLength(2)
    expect(frenchVariants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          quantity: 2,
          acceptedFinishes: ['nonfoil'],
        }),
        expect.objectContaining({ quantity: 3, acceptedFinishes: ['foil'] }),
      ]),
    )
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

  it('imports editable resolved cards as marketplace offers', () => {
    const resolution = {
      item: {
        lineNumber: 1,
        rawLine: '2 Sol Ring (CMM) 410',
        quantity: 2,
        name: 'Sol Ring',
        setCode: 'CMM',
        collectorNumber: '410',
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
    const result = applyResolvedMarketplaceImport(
      demoData,
      demoData.currentMemberId,
      [
        {
          resolution,
          quantity: 3,
          language: 'fr',
          condition: 'good',
          finish: 'foil',
          priceEur: 4.75,
        },
      ],
      ['main'],
      'card-list-alex-offers',
    )

    expect(result.imported).toEqual([
      expect.objectContaining({ cardName: 'Sol Ring', quantity: 3 }),
    ])
    expect(result.data.listings.at(-1)).toMatchObject({
      memberId: demoData.currentMemberId,
      cardListId: 'card-list-alex-offers',
      quantity: 3,
      language: 'fr',
      condition: 'good',
      finish: 'foil',
      priceEur: 4.75,
      status: 'available',
    })
  })
})
