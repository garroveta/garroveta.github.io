import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import { getManagerDashboard, getPlayerDashboard } from './dashboardSelectors'

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

    expect(dashboard.newMatches).toHaveLength(4)
    expect(dashboard.newMatches.map(({ card }) => card.name)).toEqual([
      'Sol Ring',
      'The One Ring',
      'The One Ring',
      'Cyclonic Rift',
    ])
    expect(
      dashboard.newMatches.map(({ seller }) => seller.displayName),
    ).toEqual(['Diego Sánchez', 'Sergio Gil', 'Diego Sánchez', 'Hugo Torres'])
  })
})

describe('manager dashboard selectors', () => {
  it('summarizes upcoming events and operational alerts', () => {
    const dashboard = getManagerDashboard(demoData)

    expect(dashboard.upcomingEvents).toHaveLength(10)
    expect(dashboard.upcomingEvents[0]).toMatchObject({
      event: { id: 'event-dragon-ball-store-championship' },
      game: { shortName: 'Dragon Ball' },
    })
    expect(dashboard.totalWaitlisted).toBe(3)
    expect(dashboard.fullEvents).toBe(1)
    expect(dashboard.attentionEvents.map(({ event }) => event.id)).toContain(
      'event-fnm-pauper',
    )
    expect(dashboard.latestNews[0].id).toBe('news-summer-hours')
  })
})
