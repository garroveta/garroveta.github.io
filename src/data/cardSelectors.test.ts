import { describe, expect, it } from 'vitest'

import { getMarketplaceListings, getMemberWantedCards } from './cardSelectors'
import { demoData } from './demoData'

describe('card selectors', () => {
  it('returns available marketplace listings with cards and members', () => {
    const listings = getMarketplaceListings(demoData)

    expect(listings).toHaveLength(6)
    expect(listings[0]).toMatchObject({
      card: { name: 'Sol Ring' },
      member: { displayName: 'Diego Sánchez' },
      listing: { offerType: 'trade' },
    })
  })

  it('returns the active wanted cards of a member', () => {
    expect(
      getMemberWantedCards(demoData, demoData.currentMemberId).map(
        ({ card }) => card.name,
      ),
    ).toEqual(['Sol Ring', 'The One Ring'])
  })
})
