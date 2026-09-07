import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import {
  getManagerDashboard,
  getMemberNewCardMatches,
  getPlayerDashboard,
} from './dashboardSelectors'
import type { DemoDataSet } from '../domain/types'

function getDemoMember(data: DemoDataSet, memberId: string) {
  const member = data.members.find(({ id }) => id === memberId)

  if (!member) {
    throw new Error('Missing demo member.')
  }

  return member
}

const currentMember = getDemoMember(demoData, demoData.currentMemberId)

describe('player dashboard selectors', () => {
  it('selects the next event and the member registration', () => {
    const dashboard = getPlayerDashboard(demoData, currentMember)

    expect(dashboard.nextEvent?.event.id).toBe('event-modern-tournament')
    expect(dashboard.nextEvent?.game?.shortName).toBe('MTG')
    expect(dashboard.nextEvent?.registration).toBeUndefined()
  })

  it('uses the member favorite games to personalize the next event', () => {
    const onePieceOnly = structuredClone(demoData)
    const member = getDemoMember(onePieceOnly, onePieceOnly.currentMemberId)
    member.favoriteGameIds = ['game-one-piece']

    expect(getPlayerDashboard(onePieceOnly, member).nextEvent?.event.id).toBe(
      'event-one-piece-store-championship',
    )
  })

  it('selects the latest relevant pinned news', () => {
    const dashboard = getPlayerDashboard(demoData, currentMember)

    expect(dashboard.highlightedNews?.id).toBe('news-summer-hours')
  })

  it('joins new matches with cards and sellers', () => {
    const dashboard = getPlayerDashboard(demoData, currentMember)

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

  it('highlights the ranking position for a member who follows MTG', () => {
    const dashboard = getPlayerDashboard(demoData, currentMember)

    expect(dashboard.rankingHighlight?.season?.name).toBe('Temporada 2026')
    expect(dashboard.rankingHighlight?.ranking?.rank).toBe(7)
  })

  it('hides the ranking highlight for a member who opted out of MTG', () => {
    const onePieceOnly = structuredClone(demoData)
    const member = getDemoMember(onePieceOnly, onePieceOnly.currentMemberId)
    member.favoriteGameIds = ['game-one-piece']

    expect(
      getPlayerDashboard(onePieceOnly, member).rankingHighlight,
    ).toBeUndefined()
  })

  it('resolves the ranking position using a distinct real member id', () => {
    const dashboard = getPlayerDashboard(
      demoData,
      currentMember,
      'member-sergio',
    )

    expect(dashboard.rankingHighlight?.ranking?.member.displayName).toBe(
      'Sergio Gil',
    )
  })
})

describe('manager dashboard selectors', () => {
  it('summarizes upcoming events and operational alerts', () => {
    const dashboard = getManagerDashboard(demoData)

    expect(dashboard.upcomingEvents).toHaveLength(12)
    expect(dashboard.upcomingEvents[0]).toMatchObject({
      event: { id: 'event-dragon-ball-store-championship' },
      game: { shortName: 'Dragon Ball' },
    })
    expect(dashboard.totalWaitlisted).toBe(4)
    expect(dashboard.fullEvents).toBe(2)
    expect(dashboard.pendingMembers.map(({ id }) => id)).toEqual([
      'member-lucas-pending',
    ])
    expect(dashboard.attentionEvents.map(({ event }) => event.id)).toContain(
      'event-presentation-hobbit',
    )
  })

  it('reads card matches from the prototype dataset, not the member feed', () => {
    const memberId = demoData.currentMemberId
    const expected = getMemberNewCardMatches(demoData, memberId)

    expect(expected.length).toBeGreaterThan(0)

    // a connected account replaces the members by the real community feed,
    // which does not hold the prototype sellers
    const withRealMembers = {
      ...demoData,
      members: demoData.members.filter(({ id }) => id === memberId),
    }

    expect(getMemberNewCardMatches(withRealMembers, memberId)).toEqual([])
    expect(getMemberNewCardMatches(demoData, memberId)).toHaveLength(
      expected.length,
    )
  })
})
