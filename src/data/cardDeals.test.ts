import { describe, expect, it } from 'vitest'

import { completeCardDeal } from './cardDeals'
import { demoData } from './demoData'

describe('completed card deals', () => {
  it('records an operation and closes its offer, search and match', () => {
    const updatedData = completeCardDeal(
      demoData,
      'match-alex-sol-ring',
      demoData.currentMemberId,
    )

    expect(updatedData.cardDeals).toEqual([
      expect.objectContaining({
        id: 'deal-alex-sol-ring',
        matchId: 'match-alex-sol-ring',
        type: 'sale',
      }),
    ])
    expect(
      updatedData.listings.find(({ id }) => id === 'listing-sol-ring')?.status,
    ).toBe('completed')
    expect(
      updatedData.wantedCards.find(({ id }) => id === 'wanted-alex-sol-ring')
        ?.status,
    ).toBe('fulfilled')
    expect(
      updatedData.cardMatches.find(({ id }) => id === 'match-alex-sol-ring')
        ?.status,
    ).toBe('completed')
  })

  it('rejects the wrong buyer or a duplicate operation', () => {
    expect(
      completeCardDeal(demoData, 'match-alex-sol-ring', 'member-diego'),
    ).toBe(demoData)
    const completed = completeCardDeal(
      demoData,
      'match-alex-sol-ring',
      demoData.currentMemberId,
    )
    expect(
      completeCardDeal(
        completed,
        'match-alex-sol-ring',
        demoData.currentMemberId,
      ),
    ).toBe(completed)
  })
})
