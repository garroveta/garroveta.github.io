import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import { getPlayerDashboard } from './dashboardSelectors'

describe('player dashboard selectors', () => {
  it('selects the next event and the member registration', () => {
    const dashboard = getPlayerDashboard(demoData, demoData.currentMemberId)

    expect(dashboard.nextEvent?.event.id).toBe('event-modern-tournament')
    expect(dashboard.nextEvent?.game?.shortName).toBe('MTG')
    expect(dashboard.nextEvent?.registration).toBeUndefined()
  })

  it('uses the member favorite games to personalize the next event', () => {
    const onePieceOnly = structuredClone(demoData)
    const member = onePieceOnly.members.find(
      ({ id }) => id === onePieceOnly.currentMemberId,
    )

    if (!member) {
      throw new Error('Missing demo member.')
    }

    member.favoriteGameIds = ['game-one-piece']

    expect(
      getPlayerDashboard(onePieceOnly, member.id).nextEvent?.event.id,
    ).toBe('event-one-piece-store-championship')
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
