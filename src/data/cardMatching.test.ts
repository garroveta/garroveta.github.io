import { describe, expect, it } from 'vitest'

import { applyResolvedWantedCardImport } from './cardMutations'
import { synchronizeCardMatches } from './cardMatching'
import { completeCardDeal } from './cardDeals'
import { demoData } from './demoData'

describe('card matching', () => {
  it('preserves the existing compatible matches and their statuses', () => {
    const synchronizedData = synchronizeCardMatches(demoData)

    expect(synchronizedData.cardMatches).toEqual(demoData.cardMatches)
  })

  it('creates a new match after importing a compatible search', () => {
    const importedData = applyResolvedWantedCardImport(
      demoData,
      demoData.currentMemberId,
      [
        {
          item: {
            lineNumber: 1,
            rawLine: 'Rhystic Study',
            quantity: 1,
            name: 'Rhystic Study',
            section: 'main',
          },
          status: 'resolved',
          card: {
            scryfallId: 'rhystic-study-scryfall',
            oracleId: 'rhystic-study-oracle',
            name: 'Rhystic Study',
            setCode: 'WOT',
            setName: 'Wilds of Eldraine: Enchanting Tales',
            collectorNumber: '25',
          },
        },
      ],
      'update',
      ['main'],
      true,
      undefined,
      undefined,
      [
        {
          resolution: {
            item: {
              lineNumber: 1,
              rawLine: 'Rhystic Study',
              quantity: 1,
              name: 'Rhystic Study',
              section: 'main',
            },
            status: 'resolved',
            card: {
              scryfallId: 'rhystic-study-scryfall',
              oracleId: 'rhystic-study-oracle',
              name: 'Rhystic Study',
              setCode: 'WOT',
              setName: 'Wilds of Eldraine: Enchanting Tales',
              collectorNumber: '25',
            },
          },
          quantity: 1,
          acceptedLanguages: ['en'],
          acceptedFinishes: ['nonfoil'],
        },
      ],
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

  it('preserves completed matches in the history', () => {
    const completedData = completeCardDeal(
      demoData,
      'match-alex-sol-ring',
      demoData.currentMemberId,
    )

    expect(
      synchronizeCardMatches(completedData).cardMatches.find(
        ({ id }) => id === 'match-alex-sol-ring',
      )?.status,
    ).toBe('completed')
  })

  it('keeps a match visible while its listing is reserved by its buyer', () => {
    const modifiedData = structuredClone(demoData)
    modifiedData.listings.find(({ id }) => id === 'listing-sol-ring')!.status =
      'reserved'
    modifiedData.listings.find(
      ({ id }) => id === 'listing-sol-ring',
    )!.reservedByMemberId = demoData.currentMemberId

    expect(
      synchronizeCardMatches(modifiedData).cardMatches.find(
        ({ id }) => id === 'match-alex-sol-ring',
      ),
    ).toBeDefined()
  })
})
