import { describe, expect, it } from 'vitest'

import {
  formatBadgeUnlockForWhatsApp,
  formatEventBadgeUnlocksForWhatsApp,
} from './badgeSharing'
import { demoData } from './demoData'
import { getBadgeUnlocksForEvent, getSeasonBadgeBoard } from './rankingBadges'
import type { BadgeUnlock } from './rankingBadges'

const activeScope = { gameId: 'game-mtg', seasonId: 'ranking-season-2026' }

function unlockOf(badgeId: string): BadgeUnlock {
  const board = getSeasonBadgeBoard(demoData, activeScope)!
  const badge = board.badges.find(
    ({ definition }) => definition.id === badgeId,
  )!

  return {
    definition: badge.definition,
    member: badge.holders[0].member,
    unlockedAt: badge.holders[0].unlockedAt,
  }
}

describe('badgeSharing', () => {
  it('reads well without the artwork', () => {
    const message = formatBadgeUnlockForWhatsApp({
      badgeUrl: 'https://garroveta.test/#ranking?view=badges',
      communityName: 'CRC DeLorean',
      season: { name: 'Temporada 2026' },
      unlock: unlockOf('ferocious'),
    })

    expect(message).toContain('ha desbloqueado Ferocious')
    expect(message).toContain('Termina 4 veces en el Top 4')
    expect(message).toContain('Temporada 2026 · CRC DeLorean')
  })

  it('says nothing when an event handed out no badge', () => {
    expect(formatEventBadgeUnlocksForWhatsApp([])).toBe('')
  })

  it('names the holders an event rewarded', () => {
    const unlocks = getBadgeUnlocksForEvent(
      demoData,
      activeScope,
      'event-result-fnm-standard-2026-07-17',
    )

    expect(unlocks.length).toBeGreaterThan(0)

    const summary = formatEventBadgeUnlocksForWhatsApp(unlocks)

    expect(summary).toMatch(/insignias? desbloqueadas?/)
    for (const { member, definition } of unlocks.slice(0, 4)) {
      expect(summary).toContain(`${member.displayName} — ${definition.name}`)
    }
  })

  it('summarises the tail instead of listing everyone', () => {
    const unlock = unlockOf('ferocious')
    const summary = formatEventBadgeUnlocksForWhatsApp(
      Array.from({ length: 6 }, () => unlock),
    )

    expect(summary).toContain('6 insignias desbloqueadas')
    expect(summary.split('\n')).toHaveLength(6)
    expect(summary).toContain('y 2 más')
  })

  it('ties an unlock to the event that produced it', () => {
    const board = getSeasonBadgeBoard(demoData, activeScope)!
    const holders = board.badges.flatMap(
      ({ holders: badgeHolders }) => badgeHolders,
    )

    expect(holders.length).toBeGreaterThan(0)
    expect(holders.every(({ eventId }) => eventId !== undefined)).toBe(true)
  })
})
