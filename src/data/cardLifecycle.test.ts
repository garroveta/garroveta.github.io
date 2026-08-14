import { describe, expect, it } from 'vitest'

import {
  cancelMarketplaceReservation,
  markCardMatchSeen,
  reserveMarketplaceListing,
  updateMarketplaceListingDetails,
  updateMarketplaceListingStatus,
  updateWantedCardDetails,
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

  it('lets a validated member reserve another member card', () => {
    const updatedData = reserveMarketplaceListing(
      demoData,
      'listing-sol-ring',
      demoData.currentMemberId,
    )

    expect(
      updatedData.listings.find(({ id }) => id === 'listing-sol-ring'),
    ).toMatchObject({
      status: 'reserved',
      reservedByMemberId: demoData.currentMemberId,
    })
    expect(
      reserveMarketplaceListing(demoData, 'listing-sol-ring', 'member-diego'),
    ).toBe(demoData)
  })

  it('stores a valid reserved quantity and rejects an excessive one', () => {
    const updatedData = reserveMarketplaceListing(
      demoData,
      'listing-sol-ring-marta',
      demoData.currentMemberId,
      undefined,
      2,
    )

    expect(
      updatedData.listings.find(({ id }) => id === 'listing-sol-ring-marta'),
    ).toMatchObject({
      status: 'reserved',
      reservedByMemberId: demoData.currentMemberId,
      reservedQuantity: 2,
    })
    expect(
      reserveMarketplaceListing(
        demoData,
        'listing-sol-ring-marta',
        demoData.currentMemberId,
        undefined,
        3,
      ),
    ).toBe(demoData)
  })

  it('lets the buyer or seller cancel a reservation', () => {
    const reservedData = reserveMarketplaceListing(
      demoData,
      'listing-sol-ring',
      demoData.currentMemberId,
    )
    const cancelledData = cancelMarketplaceReservation(
      reservedData,
      'listing-sol-ring',
      demoData.currentMemberId,
    )

    expect(
      cancelledData.listings.find(({ id }) => id === 'listing-sol-ring'),
    ).toMatchObject({ status: 'available' })
    expect(
      cancelledData.listings.find(({ id }) => id === 'listing-sol-ring')
        ?.reservedByMemberId,
    ).toBeUndefined()
    expect(
      cancelMarketplaceReservation(
        reservedData,
        'listing-sol-ring',
        'member-sergio',
      ),
    ).toBe(reservedData)
  })

  it('partially cancels a multi-card reservation', () => {
    const reservedData = reserveMarketplaceListing(
      demoData,
      'listing-sol-ring-marta',
      demoData.currentMemberId,
      undefined,
      2,
    )
    const partiallyCancelledData = cancelMarketplaceReservation(
      reservedData,
      'listing-sol-ring-marta',
      demoData.currentMemberId,
      1,
    )

    expect(
      partiallyCancelledData.listings.find(
        ({ id }) => id === 'listing-sol-ring-marta',
      ),
    ).toMatchObject({
      status: 'reserved',
      reservedByMemberId: demoData.currentMemberId,
      reservedQuantity: 1,
    })
    expect(
      cancelMarketplaceReservation(
        reservedData,
        'listing-sol-ring-marta',
        demoData.currentMemberId,
        3,
      ),
    ).toBe(reservedData)
  })

  it('updates the editable details of owned wanted cards and offers', () => {
    const wantedData = updateWantedCardDetails(
      demoData,
      'wanted-alex-sol-ring',
      demoData.currentMemberId,
      {
        quantity: 4,
        acceptedLanguages: ['fr'],
        acceptedFinishes: ['foil'],
      },
    )
    expect(
      wantedData.wantedCards.find(({ id }) => id === 'wanted-alex-sol-ring'),
    ).toMatchObject({
      quantity: 4,
      acceptedLanguages: ['fr'],
      acceptedFinishes: ['foil'],
    })

    const listingData = updateMarketplaceListingDetails(
      demoData,
      'listing-sol-ring',
      'member-diego',
      {
        quantity: 3,
        language: 'fr',
        condition: 'good',
        finish: 'foil',
        priceEur: 4.75,
      },
    )
    expect(
      listingData.listings.find(({ id }) => id === 'listing-sol-ring'),
    ).toMatchObject({
      quantity: 3,
      language: 'fr',
      condition: 'good',
      finish: 'foil',
      priceEur: 4.75,
    })
  })

  it('marks a match as seen only for its buyer', () => {
    expect(
      markCardMatchSeen(demoData, 'match-alex-sol-ring', 'member-diego'),
    ).toBe(demoData)

    expect(
      markCardMatchSeen(
        demoData,
        'match-alex-sol-ring',
        demoData.currentMemberId,
      ).cardMatches.find(({ id }) => id === 'match-alex-sol-ring')?.status,
    ).toBe('seen')
  })
})
