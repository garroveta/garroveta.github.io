import { describe, expect, it } from 'vitest'

import {
  updateMarketplaceListingStatus,
  updateWantedCardStatus,
} from './cardLifecycle'
import { demoData } from './demoData'

describe('card list lifecycle', () => {
  it('lets only the owner reserve or complete a listing', () => {
    expect(
      updateMarketplaceListingStatus(
        demoData,
        'listing-sol-ring',
        demoData.currentMemberId,
        'reserved',
      ),
    ).toBe(demoData)

    const updatedData = updateMarketplaceListingStatus(
      demoData,
      'listing-sol-ring',
      'member-diego',
      'reserved',
    )

    expect(
      updatedData.listings.find(({ id }) => id === 'listing-sol-ring')?.status,
    ).toBe('reserved')
    expect(
      updatedData.cardMatches.some(
        ({ listingId }) => listingId === 'listing-sol-ring',
      ),
    ).toBe(false)
  })

  it('pauses and reactivates a wanted card with its matches', () => {
    const pausedData = updateWantedCardStatus(
      demoData,
      'wanted-alex-sol-ring',
      demoData.currentMemberId,
      'paused',
    )

    expect(
      pausedData.wantedCards.find(({ id }) => id === 'wanted-alex-sol-ring')
        ?.status,
    ).toBe('paused')
    expect(
      pausedData.cardMatches.some(
        ({ wantedCardId }) => wantedCardId === 'wanted-alex-sol-ring',
      ),
    ).toBe(false)

    const activeData = updateWantedCardStatus(
      pausedData,
      'wanted-alex-sol-ring',
      demoData.currentMemberId,
      'active',
    )

    expect(
      activeData.cardMatches.some(
        ({ wantedCardId }) => wantedCardId === 'wanted-alex-sol-ring',
      ),
    ).toBe(true)
  })
})
