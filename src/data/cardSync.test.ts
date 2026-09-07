import { describe, expect, it } from 'vitest'

import {
  applyMarketplaceSyncPlan,
  computeMarketplaceSyncPlan,
  findMarketplaceImportOverlap,
  resolveMarketplaceSyncConflict,
  type MarketplaceSyncScope,
} from './cardSync'
import type { MarketplaceImportItemInput } from './cardMutations'
import { demoData } from './demoData'
import type { Card, DemoDataSet, MarketplaceListing } from '../domain/types'

const memberId = demoData.currentMemberId
const cardListId = 'card-list-alex-offers'
const scope: MarketplaceSyncScope = {
  memberId,
  cardListId,
  includedSections: ['main'],
}

const solRing: Card = {
  id: 'card-sync-sol-ring',
  name: 'Sol Ring',
  setName: 'Commander Masters',
  setCode: 'CMM',
  collectorNumber: '410',
  scryfallId: 'scryfall-sol-ring',
}
const rhysticStudy: Card = {
  id: 'card-sync-rhystic-study',
  name: 'Rhystic Study',
  setName: 'Jumpstart',
  setCode: 'JMP',
  collectorNumber: '118',
  scryfallId: 'scryfall-rhystic-study',
}

function buildData(listings: MarketplaceListing[]): DemoDataSet {
  return {
    ...demoData,
    cards: [...demoData.cards, solRing, rhysticStudy],
    listings,
    cardMatches: [],
  }
}

function buildListing(
  overrides: Partial<MarketplaceListing> & { id: string; cardId: string },
): MarketplaceListing {
  return {
    communityId: demoData.community.id,
    memberId,
    cardListId,
    quantity: 1,
    language: 'es',
    condition: 'near_mint',
    finish: 'nonfoil',
    offerType: 'sale',
    status: 'available',
    createdAt: '2026-08-01T10:00:00+02:00',
    ...overrides,
  }
}

function buildItem(
  card: Card,
  overrides: Partial<MarketplaceImportItemInput> & { lineNumber?: number } = {},
): MarketplaceImportItemInput {
  const { lineNumber = 1, ...rest } = overrides

  return {
    resolution: {
      item: {
        lineNumber,
        rawLine: `1 ${card.name}`,
        quantity: 1,
        name: card.name,
        section: 'main',
      },
      status: 'resolved',
      card: {
        scryfallId: card.scryfallId!,
        name: card.name,
        setCode: card.setCode,
        setName: card.setName,
        collectorNumber: card.collectorNumber,
      },
    },
    quantity: 1,
    language: 'es',
    condition: 'near_mint',
    finish: 'nonfoil',
    ...rest,
  }
}

describe('marketplace sync plan', () => {
  it('refuses a scope that is not an offers list of the member', () => {
    const plan = computeMarketplaceSyncPlan(
      buildData([]),
      { ...scope, cardListId: 'card-list-alex-wanted-pauper' },
      [buildItem(solRing)],
    )

    expect(plan.added).toEqual([])
    expect(plan.withdrawn).toEqual([])
  })

  it('adds a line that has no offer yet', () => {
    const plan = computeMarketplaceSyncPlan(buildData([]), scope, [
      buildItem(solRing, { quantity: 3, priceEur: 4.5 }),
    ])

    expect(plan.added).toHaveLength(1)
    expect(plan.added[0]).toMatchObject({
      cardName: 'Sol Ring',
      quantity: 3,
      priceEur: 4.5,
    })
    expect(plan.updated).toEqual([])
  })

  it('changes nothing when the same file is imported twice', () => {
    const data = buildData([
      buildListing({
        id: 'listing-sync-1',
        cardId: solRing.id,
        quantity: 3,
        priceEur: 4.5,
      }),
    ])
    const plan = computeMarketplaceSyncPlan(data, scope, [
      buildItem(solRing, { quantity: 3, priceEur: 4.5 }),
    ])

    expect(plan.unchanged).toBe(1)
    expect(plan.added).toEqual([])
    expect(plan.updated).toEqual([])
    expect(plan.withdrawn).toEqual([])
  })

  it('reports the quantity and price the file changes', () => {
    const data = buildData([
      buildListing({
        id: 'listing-sync-1',
        cardId: solRing.id,
        quantity: 3,
        priceEur: 4.5,
      }),
    ])
    const plan = computeMarketplaceSyncPlan(data, scope, [
      buildItem(solRing, { quantity: 1, priceEur: 6 }),
    ])

    expect(plan.updated).toHaveLength(1)
    expect(plan.updated[0]).toMatchObject({
      quantity: { from: 3, to: 1 },
      price: { from: 4.5, to: 6 },
      republished: false,
    })
  })

  it('never erases a local price with a file that carries none', () => {
    const data = buildData([
      buildListing({
        id: 'listing-sync-1',
        cardId: solRing.id,
        quantity: 2,
        priceEur: 4.5,
      }),
    ])
    const plan = computeMarketplaceSyncPlan(data, scope, [
      buildItem(solRing, { quantity: 2 }),
    ])

    expect(plan.unchanged).toBe(1)
    expect(plan.updated).toEqual([])
  })

  it('withdraws an offer of the scope that the file no longer lists', () => {
    const data = buildData([
      buildListing({ id: 'listing-sync-1', cardId: solRing.id }),
      buildListing({ id: 'listing-sync-2', cardId: rhysticStudy.id }),
    ])
    const plan = computeMarketplaceSyncPlan(data, scope, [buildItem(solRing)])

    expect(plan.withdrawn.map(({ id }) => id)).toEqual(['listing-sync-2'])
  })

  it('protects a reserved or sold offer instead of withdrawing it', () => {
    const data = buildData([
      buildListing({
        id: 'listing-sync-reserved',
        cardId: solRing.id,
        status: 'reserved',
        reservedByMemberId: 'member-diego',
        reservedQuantity: 1,
      }),
      buildListing({
        id: 'listing-sync-sold',
        cardId: rhysticStudy.id,
        status: 'completed',
      }),
    ])
    const plan = computeMarketplaceSyncPlan(data, scope, [])

    expect(plan.withdrawn).toEqual([])
    expect(
      plan.protectedListings.map(({ listing, reason }) => [listing.id, reason]),
    ).toEqual([
      ['listing-sync-reserved', 'reserved'],
      ['listing-sync-sold', 'completed'],
    ])
  })

  it('republishes a withdrawn offer that comes back in the file', () => {
    const data = buildData([
      buildListing({
        id: 'listing-sync-1',
        cardId: solRing.id,
        quantity: 2,
        status: 'withdrawn',
      }),
    ])
    const plan = computeMarketplaceSyncPlan(data, scope, [
      buildItem(solRing, { quantity: 2 }),
    ])

    expect(plan.added).toEqual([])
    expect(plan.updated).toHaveLength(1)
    expect(plan.updated[0]).toMatchObject({
      republished: true,
      quantity: undefined,
    })
  })

  it('leaves a withdrawn offer absent from the file alone', () => {
    const data = buildData([
      buildListing({
        id: 'listing-sync-1',
        cardId: solRing.id,
        status: 'withdrawn',
      }),
    ])
    const plan = computeMarketplaceSyncPlan(data, scope, [])

    expect(plan.withdrawn).toEqual([])
    expect(plan.unchanged).toBe(1)
  })

  it('raises a conflict when several offers answer the same line', () => {
    const data = buildData([
      buildListing({
        id: 'listing-sync-1',
        cardId: solRing.id,
        priceEur: 4.5,
      }),
      buildListing({
        id: 'listing-sync-2',
        cardId: solRing.id,
        priceEur: 6.5,
      }),
    ])
    const plan = computeMarketplaceSyncPlan(data, scope, [
      buildItem(solRing, { quantity: 2, priceEur: 5 }),
    ])

    expect(plan.conflicts).toHaveLength(1)
    expect(plan.conflicts[0].reason).toBe('duplicate_listings')
    expect(plan.conflicts[0].listings.map(({ id }) => id)).toEqual([
      'listing-sync-1',
      'listing-sync-2',
    ])
    expect(plan.updated).toEqual([])
    expect(plan.withdrawn).toEqual([])
  })

  it('sums identical lines of the file and raises a conflict on differing prices', () => {
    const merged = computeMarketplaceSyncPlan(buildData([]), scope, [
      buildItem(solRing, { quantity: 2, priceEur: 5, lineNumber: 1 }),
      buildItem(solRing, { quantity: 1, priceEur: 5, lineNumber: 2 }),
    ])

    expect(merged.conflicts).toEqual([])
    expect(merged.added).toHaveLength(1)
    expect(merged.added[0]).toMatchObject({
      quantity: 3,
      priceEur: 5,
      lineNumbers: [1, 2],
    })

    const ambiguous = computeMarketplaceSyncPlan(buildData([]), scope, [
      buildItem(solRing, { quantity: 2, priceEur: 5, lineNumber: 1 }),
      buildItem(solRing, { quantity: 1, priceEur: 7, lineNumber: 2 }),
    ])

    expect(ambiguous.added).toEqual([])
    expect(ambiguous.conflicts).toHaveLength(1)
    expect(ambiguous.conflicts[0].reason).toBe('ambiguous_price')
    expect(ambiguous.conflicts[0].line.candidatePrices).toEqual([5, 7])
  })

  it('never withdraws an offer that an unresolved line still names', () => {
    const data = buildData([
      buildListing({ id: 'listing-sync-1', cardId: solRing.id }),
      buildListing({ id: 'listing-sync-2', cardId: rhysticStudy.id }),
    ])
    const unresolved = buildItem(rhysticStudy)
    const plan = computeMarketplaceSyncPlan(data, scope, [
      buildItem(solRing),
      {
        ...unresolved,
        resolution: { item: unresolved.resolution.item, status: 'unresolved' },
      },
    ])

    expect(plan.unresolvedLines).toHaveLength(1)
    expect(plan.added).toEqual([])
    expect(plan.withdrawn).toEqual([])
    expect(
      plan.protectedListings.map(({ listing, reason }) => [listing.id, reason]),
    ).toEqual([['listing-sync-2', 'unresolved_line']])
  })

  it('never touches an offer outside the scope', () => {
    const data = buildData([
      buildListing({
        id: 'listing-other-list',
        cardId: rhysticStudy.id,
        cardListId: undefined,
      }),
      buildListing({
        id: 'listing-other-member',
        cardId: rhysticStudy.id,
        memberId: 'member-diego',
      }),
    ])
    const plan = computeMarketplaceSyncPlan(data, scope, [buildItem(solRing)])

    expect(plan.withdrawn).toEqual([])
    expect(plan.added).toHaveLength(1)
  })

  it('ignores a line from a section left out of the import', () => {
    const sideboardItem = buildItem(solRing)
    const plan = computeMarketplaceSyncPlan(buildData([]), scope, [
      {
        ...sideboardItem,
        resolution: {
          ...sideboardItem.resolution,
          item: { ...sideboardItem.resolution.item, section: 'sideboard' },
        },
      },
    ])

    expect(plan.added).toEqual([])
  })
})

describe('marketplace sync application', () => {
  it('refuses to apply a plan that still holds a conflict', () => {
    const data = buildData([
      buildListing({ id: 'listing-sync-1', cardId: solRing.id }),
      buildListing({ id: 'listing-sync-2', cardId: solRing.id, priceEur: 6 }),
    ])
    const plan = computeMarketplaceSyncPlan(data, scope, [
      buildItem(solRing, { quantity: 2 }),
    ])

    expect(plan.conflicts).toHaveLength(1)

    const result = applyMarketplaceSyncPlan(data, scope, plan)

    expect(result.data).toBe(data)
    expect(result).toMatchObject({ added: 0, updated: 0, withdrawn: 0 })
  })

  it('settles a conflict by keeping one offer and withdrawing the others', () => {
    const data = buildData([
      buildListing({ id: 'listing-sync-1', cardId: solRing.id, priceEur: 4 }),
      buildListing({ id: 'listing-sync-2', cardId: solRing.id, priceEur: 6 }),
    ])
    const plan = computeMarketplaceSyncPlan(data, scope, [
      buildItem(solRing, { quantity: 2 }),
    ])
    const settled = resolveMarketplaceSyncConflict(
      plan,
      plan.conflicts[0].line.key,
      { kind: 'apply', listingId: 'listing-sync-1', quantity: 5, priceEur: 7 },
    )

    expect(settled.conflicts).toEqual([])
    expect(settled.updated).toHaveLength(1)
    expect(settled.updated[0]).toMatchObject({
      quantity: { from: 1, to: 5 },
      price: { from: 4, to: 7 },
    })
    expect(settled.withdrawn.map(({ id }) => id)).toEqual(['listing-sync-2'])

    const result = applyMarketplaceSyncPlan(data, scope, settled)
    const listings = result.data.listings

    expect(listings.find(({ id }) => id === 'listing-sync-1')).toMatchObject({
      quantity: 5,
      priceEur: 7,
      status: 'available',
    })
    expect(listings.find(({ id }) => id === 'listing-sync-2')?.status).toBe(
      'withdrawn',
    )
    expect(result).toMatchObject({ added: 0, updated: 1, withdrawn: 1 })
  })

  it('leaves every offer of a skipped conflict untouched', () => {
    const data = buildData([
      buildListing({ id: 'listing-sync-1', cardId: solRing.id }),
      buildListing({ id: 'listing-sync-2', cardId: solRing.id }),
    ])
    const plan = computeMarketplaceSyncPlan(data, scope, [buildItem(solRing)])
    const settled = resolveMarketplaceSyncConflict(
      plan,
      plan.conflicts[0].line.key,
      { kind: 'skip' },
    )
    const result = applyMarketplaceSyncPlan(data, scope, settled)

    expect(settled.unchanged).toBe(2)
    expect(result).toMatchObject({ added: 0, updated: 0, withdrawn: 0 })
    expect(
      result.data.listings.filter(({ status }) => status !== 'available'),
    ).toEqual([])
  })

  it('settles an ambiguous price into a single new offer', () => {
    const data = buildData([])
    const plan = computeMarketplaceSyncPlan(data, scope, [
      buildItem(solRing, { quantity: 2, priceEur: 5, lineNumber: 1 }),
      buildItem(solRing, { quantity: 1, priceEur: 7, lineNumber: 2 }),
    ])
    const settled = resolveMarketplaceSyncConflict(
      plan,
      plan.conflicts[0].line.key,
      { kind: 'apply', quantity: 3, priceEur: 6 },
    )

    expect(settled.added).toHaveLength(1)

    const result = applyMarketplaceSyncPlan(data, scope, settled)

    expect(result.added).toBe(1)
    expect(result.data.listings.at(-1)).toMatchObject({
      memberId,
      cardListId,
      quantity: 3,
      priceEur: 6,
      status: 'available',
    })
  })

  it('creates the catalogue entry of an offer the community did not know', () => {
    const data: DemoDataSet = {
      ...demoData,
      cards: demoData.cards.filter(({ id }) => id !== solRing.id),
      listings: [],
      cardMatches: [],
    }
    const plan = computeMarketplaceSyncPlan(data, scope, [
      buildItem(solRing, { quantity: 1, priceEur: 3 }),
    ])
    const result = applyMarketplaceSyncPlan(data, scope, plan)
    const createdCard = result.data.cards.find(
      ({ scryfallId }) => scryfallId === solRing.scryfallId,
    )

    expect(createdCard).toMatchObject({ name: 'Sol Ring', setCode: 'CMM' })
    expect(result.data.listings.at(-1)?.cardId).toBe(createdCard?.id)
  })

  it('applies a republication and reports an offer reserved meanwhile', () => {
    const data = buildData([
      buildListing({
        id: 'listing-sync-1',
        cardId: solRing.id,
        status: 'withdrawn',
      }),
      buildListing({ id: 'listing-sync-2', cardId: rhysticStudy.id }),
    ])
    const plan = computeMarketplaceSyncPlan(data, scope, [buildItem(solRing)])

    expect(plan.withdrawn.map(({ id }) => id)).toEqual(['listing-sync-2'])

    const movedOn: DemoDataSet = {
      ...data,
      listings: data.listings.map((listing) =>
        listing.id === 'listing-sync-2'
          ? {
              ...listing,
              status: 'reserved' as const,
              reservedByMemberId: 'member-diego',
              reservedQuantity: 1,
            }
          : listing,
      ),
    }
    const result = applyMarketplaceSyncPlan(movedOn, scope, plan)

    expect(result.updated).toBe(1)
    expect(result.withdrawn).toBe(0)
    expect(result.skipped.map(({ id }) => id)).toEqual(['listing-sync-2'])
    expect(
      result.data.listings.find(({ id }) => id === 'listing-sync-1')?.status,
    ).toBe('available')
    expect(
      result.data.listings.find(({ id }) => id === 'listing-sync-2')?.status,
    ).toBe('reserved')
  })
})

describe('marketplace import overlap', () => {
  it('counts the lines the member already offers', () => {
    const data = buildData([
      buildListing({ id: 'listing-sync-1', cardId: solRing.id }),
    ])
    const overlap = findMarketplaceImportOverlap(
      data,
      memberId,
      [buildItem(solRing), buildItem(rhysticStudy)],
      ['main'],
    )

    expect(overlap).toEqual({
      matchedLines: 1,
      totalLines: 2,
      cardListIds: [cardListId],
    })
  })

  it('looks across every private list, not just one', () => {
    const data = buildData([
      buildListing({
        id: 'listing-sync-1',
        cardId: solRing.id,
        cardListId: undefined,
      }),
    ])
    const overlap = findMarketplaceImportOverlap(
      data,
      memberId,
      [buildItem(solRing)],
      ['main'],
    )

    expect(overlap.matchedLines).toBe(1)
    expect(overlap.cardListIds).toEqual([])
  })

  it('ignores another member and a variant that differs', () => {
    const data = buildData([
      buildListing({
        id: 'listing-other-member',
        cardId: solRing.id,
        memberId: 'member-diego',
      }),
      buildListing({
        id: 'listing-other-language',
        cardId: rhysticStudy.id,
        language: 'en',
      }),
    ])
    const overlap = findMarketplaceImportOverlap(
      data,
      memberId,
      [buildItem(solRing), buildItem(rhysticStudy)],
      ['main'],
    )

    expect(overlap.matchedLines).toBe(0)
  })

  it('does not count an offer already sold', () => {
    const data = buildData([
      buildListing({
        id: 'listing-sync-1',
        cardId: solRing.id,
        status: 'completed',
      }),
    ])
    const overlap = findMarketplaceImportOverlap(
      data,
      memberId,
      [buildItem(solRing)],
      ['main'],
    )

    expect(overlap.matchedLines).toBe(0)
  })

  it('counts an offer that was withdrawn', () => {
    const data = buildData([
      buildListing({
        id: 'listing-sync-1',
        cardId: solRing.id,
        status: 'withdrawn',
      }),
    ])
    const overlap = findMarketplaceImportOverlap(
      data,
      memberId,
      [buildItem(solRing)],
      ['main'],
    )

    expect(overlap.matchedLines).toBe(1)
  })
})
