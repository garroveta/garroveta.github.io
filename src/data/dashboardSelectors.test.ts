import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import { getPlayerDashboard } from './dashboardSelectors'

describe('player dashboard selectors', () => {
  it('selects the next event and the member registration', () => {
    const dashboard = getPlayerDashboard(demoData, demoData.currentMemberId)

    expect(dashboard.nextEvent?.event.id).toBe('event-draft-friday')
    expect(dashboard.nextEvent?.registration?.status).toBe('waitlisted')
  })

  it('selects the latest relevant pinned news', () => {
    const dashboard = getPlayerDashboard(demoData, demoData.currentMemberId)

    expect(dashboard.highlightedNews?.id).toBe('news-summer-hours')
  })

  it('joins new matches with cards and sellers', () => {
    const dashboard = getPlayerDashboard(demoData, demoData.currentMemberId)

    expect(dashboard.newMatches).toHaveLength(2)
    expect(dashboard.newMatches.map(({ card }) => card.name)).toEqual([
      'Sol Ring',
      'The One Ring',
    ])
    expect(
      dashboard.newMatches.map(({ seller }) => seller.displayName),
    ).toEqual(['Diego Sánchez', 'Sergio Gil'])
  })
})
