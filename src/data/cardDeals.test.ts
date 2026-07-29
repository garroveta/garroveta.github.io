import { describe, expect, it } from 'vitest'

import { completeCardDeal } from './cardDeals'
import { demoData } from './demoData'

describe('completed card deals', () => {
  it('records a trade and closes its offer, search and match', () => {
    const updatedData = completeCardDeal(
      demoData,
      'match-alex-sol-ring',
      demoData.currentMemberId,
      'trade',
    )

    expect(updatedData.cardDeals).toEqual([
      expect.objectContaining({
        id: 'deal-alex-sol-ring',
        matchId: 'match-alex-sol-ring',
        type: 'trade',
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

  it('rejects the wrong buyer or an operation not offered', () => {
    expect(
      completeCardDeal(
        demoData,
        'match-alex-sol-ring',
        'member-diego',
        'trade',
      ),
    ).toBe(demoData)
    expect(
      completeCardDeal(
        demoData,
        'match-alex-sol-ring',
        demoData.currentMemberId,
        'sale',
      ),
    ).toBe(demoData)
  })
})
