import { describe, expect, it } from 'vitest'

import {
  getMarketplaceListings,
  getMemberCardMatches,
  getMemberMarketplaceListings,
  getMemberWantedCards,
} from './cardSelectors'
import { demoData } from './demoData'
import type { DemoDataSet } from '../domain/types'

describe('card selectors', () => {
  it('returns available marketplace listings with cards and members', () => {
    const listings = getMarketplaceListings(demoData)

    expect(listings).toHaveLength(159)
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
    ).toEqual(['Sol Ring', 'The One Ring', 'Cyclonic Rift'])
  })

  it('returns every listing owned by a member regardless of status', () => {
    const modifiedData: DemoDataSet = structuredClone(demoData)
    modifiedData.listings[0].status = 'reserved'

    expect(
      getMemberMarketplaceListings(modifiedData, 'member-diego').map(
        ({ listing }) => listing.status,
      ),
    ).toEqual(['reserved', 'available'])
  })

  it('returns the member matches with their offers and sellers', () => {
    const matches = getMemberCardMatches(demoData, demoData.currentMemberId)

    expect(matches).toHaveLength(6)
    expect(matches.filter(({ card }) => card.name === 'Sol Ring')).toHaveLength(
      3,
    )
    expect(
      matches.filter(({ card }) => card.name === 'The One Ring'),
    ).toHaveLength(2)
    expect(matches[0]).toMatchObject({
      seller: { displayName: 'Diego Sánchez' },
      listing: { language: 'es' },
      match: { status: 'new', score: 100 },
    })
  })
})
