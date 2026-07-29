import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import { toggleFavoriteGame } from './memberPreferences'

describe('member game preferences', () => {
  it('adds and removes a favorite game', () => {
    const withGundam = toggleFavoriteGame(
      demoData,
      demoData.currentMemberId,
      'game-gundam',
    )

    expect(
      withGundam.members.find(({ id }) => id === demoData.currentMemberId)
        ?.favoriteGameIds,
    ).toContain('game-gundam')

    const withoutGundam = toggleFavoriteGame(
      withGundam,
      demoData.currentMemberId,
      'game-gundam',
    )

    expect(
      withoutGundam.members.find(({ id }) => id === demoData.currentMemberId)
        ?.favoriteGameIds,
    ).not.toContain('game-gundam')
  })

  it('ignores unknown games and members', () => {
    expect(
      toggleFavoriteGame(demoData, demoData.currentMemberId, 'unknown-game'),
    ).toBe(demoData)
    expect(toggleFavoriteGame(demoData, 'unknown-member', 'game-mtg')).toBe(
      demoData,
    )
  })
})
