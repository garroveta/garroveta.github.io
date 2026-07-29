import { describe, expect, it } from 'vitest'

import type { DemoDataSet } from '../domain/types'
import { demoData, getDemoDataSummary } from './demoData'

function expectUniqueIds(items: Array<{ id: string }>) {
  const ids = items.map(({ id }) => id)
  expect(new Set(ids).size).toBe(ids.length)
}

describe('demoData', () => {
  it('contains unique identifiers in every collection', () => {
    expectUniqueIds(demoData.tags)
    expectUniqueIds(demoData.members)
    expectUniqueIds(demoData.events)
    expectUniqueIds(demoData.registrations)
    expectUniqueIds(demoData.newsPosts)
    expectUniqueIds(demoData.cards)
    expectUniqueIds(demoData.listings)
    expectUniqueIds(demoData.wantedCards)
    expectUniqueIds(demoData.cardMatches)
    expectUniqueIds(demoData.cardDeals)
  })

  it('keeps all community references consistent', () => {
    const memberIds = new Set(demoData.members.map(({ id }) => id))
    const tagIds = new Set(demoData.tags.map(({ id }) => id))
    const eventIds = new Set(demoData.events.map(({ id }) => id))
    const cardIds = new Set(demoData.cards.map(({ id }) => id))
    const listingIds = new Set(demoData.listings.map(({ id }) => id))
    const wantedCardIds = new Set(demoData.wantedCards.map(({ id }) => id))
    const matchIds = new Set(demoData.cardMatches.map(({ id }) => id))
    const cardDeals: DemoDataSet['cardDeals'] = demoData.cardDeals

    expect(memberIds.has(demoData.currentMemberId)).toBe(true)
    expect(demoData.community.memberCount).toBeGreaterThanOrEqual(
      demoData.members.length,
    )

    for (const member of demoData.members) {
      expect(member.communityId).toBe(demoData.community.id)
      member.tagIds.forEach((tagId) => expect(tagIds.has(tagId)).toBe(true))
    }

    for (const event of demoData.events) {
      expect(event.communityId).toBe(demoData.community.id)
      expect(memberIds.has(event.createdByMemberId)).toBe(true)
      expect(event.registrationSummary.confirmed).toBeLessThanOrEqual(
        event.capacity,
      )
      event.tagIds.forEach((tagId) => expect(tagIds.has(tagId)).toBe(true))
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
    }

    for (const wantedCard of demoData.wantedCards) {
      expect(wantedCard.communityId).toBe(demoData.community.id)
      expect(memberIds.has(wantedCard.memberId)).toBe(true)
      expect(cardIds.has(wantedCard.cardId)).toBe(true)
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
      events: 5,
      newsPosts: 6,
      cardMatches: 5,
    })
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
      demoData.events.find(({ id }) => id === 'event-fnm-pauper'),
    ).toMatchObject({
      title: 'FNM Pauper',
      startsAt: '2026-07-31T18:00:00+02:00',
      tagIds: ['tag-pauper'],
      description: expect.stringContaining('tres rondas fijas'),
    })

    expect(
      demoData.events.find(({ id }) => id === 'event-presentation-hobbit'),
    ).toMatchObject({
      title: 'Presentación: The Hobbit',
      startsAt: '2026-08-08T17:00:00+02:00',
      capacity: 30,
    })
  })
})
