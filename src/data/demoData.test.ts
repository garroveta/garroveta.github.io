import { describe, expect, it } from 'vitest'

import type { DemoDataSet } from '../domain/types'
import { demoData, getDemoDataSummary } from './demoData'

function expectUniqueIds(items: Array<{ id: string }>) {
  const ids = items.map(({ id }) => id)
  expect(new Set(ids).size).toBe(ids.length)
}

describe('demoData', () => {
  it('separates formats, activities, series and audience tags', () => {
    expect(
      demoData.competitionEventKinds.map(({ shortName }) => shortName),
    ).not.toContain('Torneo')
    expect(new Set(demoData.tags.map(({ kind }) => kind))).toEqual(
      new Set(['interest', 'communication']),
    )
  })

  it('uses Standard for the demo results while keeping Pauper available', () => {
    const mtgFormats = demoData.competitionFormats
      .filter(({ gameId }) => gameId === 'game-mtg')
      .map(({ name }) => name)

    expect(mtgFormats).toEqual(expect.arrayContaining(['Standard', 'Pauper']))
    expect(
      demoData.events
        .filter(({ id }) => id.includes('event-result-fnm'))
        .every(
          ({ formatId, title }) =>
            formatId === 'format-mtg-standard' && title.includes('Standard'),
        ),
    ).toBe(true)
  })

  it('contains unique identifiers in every collection', () => {
    expectUniqueIds(demoData.games)
    expectUniqueIds(demoData.competitionFormats)
    expectUniqueIds(demoData.competitionEventKinds)
    expectUniqueIds(demoData.tags)
    expectUniqueIds(demoData.members)
    expectUniqueIds(demoData.events)
    expectUniqueIds(demoData.eventStandings)
    expectUniqueIds(demoData.registrations)
    expectUniqueIds(demoData.newsPosts)
    expectUniqueIds(demoData.cards)
    expectUniqueIds(demoData.cardLists)
    expectUniqueIds(demoData.listings)
    expectUniqueIds(demoData.wantedCards)
    expectUniqueIds(demoData.cardMatches)
    expectUniqueIds(demoData.cardDeals)
  })

  it('keeps all community references consistent', () => {
    const memberIds = new Set(demoData.members.map(({ id }) => id))
    const gameIds = new Set(demoData.games.map(({ id }) => id))
    const formatIds = new Set(demoData.competitionFormats.map(({ id }) => id))
    const competitionEventKindIds = new Set(
      demoData.competitionEventKinds.map(({ id }) => id),
    )
    const tagIds = new Set(demoData.tags.map(({ id }) => id))
    const eventIds = new Set(demoData.events.map(({ id }) => id))
    const cardIds = new Set(demoData.cards.map(({ id }) => id))
    const cardListIds = new Set(demoData.cardLists.map(({ id }) => id))
    const listingIds = new Set(demoData.listings.map(({ id }) => id))
    const wantedCardIds = new Set(demoData.wantedCards.map(({ id }) => id))
    const matchIds = new Set(demoData.cardMatches.map(({ id }) => id))
    const cardDeals: DemoDataSet['cardDeals'] = demoData.cardDeals

    expect(memberIds.has(demoData.currentMemberId)).toBe(true)
    expect(demoData.community.memberCount).toBeGreaterThanOrEqual(
      demoData.members.length,
    )

    for (const game of demoData.games) {
      expect(game.communityId).toBe(demoData.community.id)
    }

    for (const member of demoData.members) {
      expect(member.communityId).toBe(demoData.community.id)
      member.tagIds.forEach((tagId) => expect(tagIds.has(tagId)).toBe(true))
      member.favoriteGameIds.forEach((gameId) =>
        expect(gameIds.has(gameId)).toBe(true),
      )
    }

    for (const format of demoData.competitionFormats) {
      expect(gameIds.has(format.gameId)).toBe(true)
    }

    for (const event of demoData.events) {
      expect(event.communityId).toBe(demoData.community.id)
      expect(memberIds.has(event.createdByMemberId)).toBe(true)
      if (event.gameId) {
        expect(gameIds.has(event.gameId)).toBe(true)
      }
      if (event.formatId) {
        expect(formatIds.has(event.formatId)).toBe(true)
      }
      if (event.competitionEventKindId) {
        expect(competitionEventKindIds.has(event.competitionEventKindId)).toBe(
          true,
        )
      }
      expect(event.registrationSummary.confirmed).toBeLessThanOrEqual(
        event.capacity,
      )
      event.tagIds.forEach((tagId) => expect(tagIds.has(tagId)).toBe(true))
    }

    for (const standing of demoData.eventStandings) {
      expect(eventIds.has(standing.eventId)).toBe(true)
      for (const entry of standing.entries) {
        if (entry.memberId) {
          expect(memberIds.has(entry.memberId)).toBe(true)
        }
        expect(entry.rank).toBeGreaterThan(0)
        expect(entry.eventPoints).toBe(entry.wins * 3 + entry.draws)
        expect(entry.wins + entry.losses + entry.draws).toBeGreaterThan(0)
        expect(entry.opponentMatchWinPercentage).toBeGreaterThanOrEqual(0)
        expect(entry.opponentMatchWinPercentage).toBeLessThanOrEqual(100)
        expect(entry.gameWinPercentage).toBeGreaterThanOrEqual(0)
        expect(entry.gameWinPercentage).toBeLessThanOrEqual(100)
        expect(entry.opponentGameWinPercentage).toBeGreaterThanOrEqual(0)
        expect(entry.opponentGameWinPercentage).toBeLessThanOrEqual(100)
      }
    }

    for (const registration of demoData.registrations) {
      expect(eventIds.has(registration.eventId)).toBe(true)
      expect(memberIds.has(registration.memberId)).toBe(true)
    }

    for (const post of demoData.newsPosts) {
      expect(post.communityId).toBe(demoData.community.id)
      expect(memberIds.has(post.authorMemberId)).toBe(true)
      post.tagIds.forEach((tagId) => expect(tagIds.has(tagId)).toBe(true))
    }

    for (const listing of demoData.listings) {
      expect(listing.communityId).toBe(demoData.community.id)
      expect(memberIds.has(listing.memberId)).toBe(true)
      expect(cardIds.has(listing.cardId)).toBe(true)
      if (listing.cardListId) {
        expect(cardListIds.has(listing.cardListId)).toBe(true)
      }
    }

    for (const wantedCard of demoData.wantedCards) {
      expect(wantedCard.communityId).toBe(demoData.community.id)
      expect(memberIds.has(wantedCard.memberId)).toBe(true)
      expect(cardIds.has(wantedCard.cardId)).toBe(true)
      if (wantedCard.cardListId) {
        expect(cardListIds.has(wantedCard.cardListId)).toBe(true)
      }
    }

    for (const deal of cardDeals) {
      expect(matchIds.has(deal.matchId)).toBe(true)
      expect(listingIds.has(deal.listingId)).toBe(true)
      expect(wantedCardIds.has(deal.wantedCardId)).toBe(true)
      expect(memberIds.has(deal.buyerMemberId)).toBe(true)
      expect(memberIds.has(deal.sellerMemberId)).toBe(true)
    }
  })

  it('connects every card match to the correct offer and search', () => {
    for (const match of demoData.cardMatches) {
      const listing = demoData.listings.find(({ id }) => id === match.listingId)
      const wantedCard = demoData.wantedCards.find(
        ({ id }) => id === match.wantedCardId,
      )

      expect(listing).toBeDefined()
      expect(wantedCard).toBeDefined()
      expect(listing?.cardId).toBe(wantedCard?.cardId)
      expect(listing?.memberId).toBe(match.sellerMemberId)
      expect(wantedCard?.memberId).toBe(match.buyerMemberId)
      expect(match.sellerMemberId).not.toBe(match.buyerMemberId)
      expect(match.score).toBeGreaterThan(0)
      expect(match.score).toBeLessThanOrEqual(100)
    }
  })

  it('exposes the expected pilot summary', () => {
    expect(getDemoDataSummary()).toEqual({
      members: 150,
      events: 24,
      newsPosts: 6,
      cardMatches: 9,
    })
  })

  it('includes a varied 150-card marketplace inventory for display tests', () => {
    const generatedListings = demoData.listings.filter(({ id }) =>
      id.startsWith('listing-marketplace-demo-'),
    )

    expect(generatedListings).toHaveLength(150)
    expect(
      new Set(generatedListings.map(({ language }) => language)).size,
    ).toBe(7)
    expect(
      new Set(generatedListings.map(({ condition }) => condition)).size,
    ).toBe(4)
    expect(
      new Set(generatedListings.map(({ offerType }) => offerType)),
    ).toEqual(new Set(['sale']))
    expect(generatedListings.some(({ finish }) => finish === 'foil')).toBe(true)
    expect(
      generatedListings.some(({ priceEur }) => priceEur === undefined),
    ).toBe(true)
  })

  it('contains the pilot summer schedule and requested events', () => {
    expect(demoData.community.openingHours).toEqual([
      { day: 'monday' },
      { day: 'tuesday' },
      { day: 'wednesday', opensAt: '17:00', closesAt: '24:00' },
      { day: 'thursday', opensAt: '17:00', closesAt: '24:00' },
      {
        day: 'friday',
        opensAt: '17:00',
        closesAt: '01:00',
        closesNextDay: true,
      },
      {
        day: 'saturday',
        opensAt: '09:00',
        closesAt: '01:00',
        closesNextDay: true,
      },
      { day: 'sunday', opensAt: '09:00', closesAt: '23:00' },
    ])

    expect(
      demoData.events.find(({ id }) => id === 'event-fnm-standard'),
    ).toMatchObject({
      title: 'FNM Standard',
      startsAt: '2026-07-31T18:00:00+02:00',
      tagIds: ['tag-standard'],
      description: expect.stringContaining('tres rondas fijas'),
    })

    expect(
      demoData.events.find(({ id }) => id === 'event-presentation-hobbit'),
    ).toMatchObject({
      title: 'Presentación: The Hobbit',
      startsAt: '2026-08-08T17:00:00+02:00',
      registrationEnabled: true,
      capacity: 30,
      registrationSummary: { confirmed: 30, waitlisted: 3 },
    })

    expect(
      demoData.events
        .filter(({ type }) => type === 'draft')
        .map(({ capacity }) => capacity),
    ).toEqual([4, 8])
  })

  it('includes realistic EventLink player names for import tests', () => {
    const standing = demoData.eventStandings.find(
      ({ eventId }) => eventId === 'event-result-fnm-standard-2026-07-24',
    )

    expect(standing?.entries.map(({ displayName }) => displayName)).toEqual(
      expect.arrayContaining([
        'Pep Peralta Isern',
        'Antoni Daniel Frontera Borrueco',
        'Vicenç Massutí Villalonga',
        'José Thomas 🔴⚪',
        'Jose Ramis',
      ]),
    )
    expect(standing?.entries).toHaveLength(36)
  })
})
