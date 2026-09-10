import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import {
  SEASON_BADGES,
  getDefaultBadgeSettings,
  getMemberSeasonBadges,
  resolveSeasonBadges,
} from './rankingBadges'
import {
  isCommunityBadgeSettingsValid,
  updateCommunityBadgeSettings,
} from './rankingBadgeSettings'
import type { CommunityBadgeSettings, DemoDataSet } from '../domain/types'

const activeScope = { gameId: 'game-mtg', seasonId: 'ranking-season-2026' }

function settingsWith(id: string, patch: { name?: string; target?: number }) {
  const settings = getDefaultBadgeSettings()

  return {
    badges: settings.badges.map((badge) =>
      badge.id === id ? { ...badge, ...patch } : badge,
    ),
  }
}

function badgeOf(settings: CommunityBadgeSettings, id: string) {
  return resolveSeasonBadges(settings).find((badge) => badge.id === id)!
}

describe('rankingBadgeSettings', () => {
  it('ships defaults that mirror the catalogue', () => {
    const settings = getDefaultBadgeSettings()

    expect(settings.badges).toHaveLength(SEASON_BADGES.length)
    expect(isCommunityBadgeSettingsValid(settings)).toBe(true)
    expect(demoData.badgeSettings).toEqual(settings)
  })

  it('writes the description from the threshold, never from the settings', () => {
    expect(badgeOf(getDefaultBadgeSettings(), 'ferocious').description).toBe(
      'Termina 4 veces en el Top 4 (mínimo 8 jugadores)',
    )
    expect(
      badgeOf(settingsWith('ferocious', { target: 7 }), 'ferocious')
        .description,
    ).toBe('Termina 7 veces en el Top 4 (mínimo 8 jugadores)')
  })

  it('keeps the sentence readable at a threshold of one', () => {
    expect(
      badgeOf(settingsWith('ferocious', { target: 1 }), 'ferocious')
        .description,
    ).toBe('Termina 1 vez en el Top 4 (mínimo 8 jugadores)')
    expect(
      badgeOf(settingsWith('prowess', { target: 1 }), 'prowess').description,
    ).toBe('Termina 1 vez seguida en el Top 4')
  })

  it('keeps the keyword reference out of reach of the settings', () => {
    const renamed = settingsWith('ferocious', { name: 'Bestial' })
    const badge = badgeOf(renamed, 'ferocious')

    expect(badge.name).toBe('Bestial')
    expect(badge.reference).toBe(
      'Ferocidad: se activa si controlas una criatura con fuerza 4 o más.',
    )
  })

  it('refuses a setting that does not describe a badge of the catalogue', () => {
    expect(
      isCommunityBadgeSettingsValid({
        badges: [{ id: 'unknown-badge', name: 'Nope', target: 3 }],
      }),
    ).toBe(false)
    expect(
      isCommunityBadgeSettingsValid(settingsWith('ferocious', { name: '  ' })),
    ).toBe(false)
    expect(
      isCommunityBadgeSettingsValid(settingsWith('ferocious', { target: 0 })),
    ).toBe(false)
    expect(
      isCommunityBadgeSettingsValid(settingsWith('ferocious', { target: 2.5 })),
    ).toBe(false)
  })

  it('refuses a threshold on a badge the final ranking decides', () => {
    expect(
      isCommunityBadgeSettingsValid(settingsWith('monarch', { target: 2 })),
    ).toBe(false)
  })

  it('only lets a manager save, and freezes the active season with it', () => {
    const settings = settingsWith('ferocious', { name: 'Bestial', target: 6 })

    expect(
      updateCommunityBadgeSettings(demoData, 'member-carla', settings),
    ).toBe(demoData)

    const saved = updateCommunityBadgeSettings(
      demoData,
      'member-lucia',
      settings,
    )

    expect(saved.badgeSettings.badges).toEqual(settings.badges)
    expect(
      saved.rankingSeasons.find(({ status }) => status === 'active')?.badges,
    ).toEqual(settings.badges)
    expect(
      saved.rankingSeasons.find(({ status }) => status === 'closed')?.badges,
    ).toBeUndefined()
  })

  it('reads a season through the badges frozen with it', () => {
    const data = structuredClone(demoData) as DemoDataSet
    const activeSeason = data.rankingSeasons.find(
      ({ status }) => status === 'active',
    )!

    activeSeason.badges = settingsWith('ferocious', {
      name: 'Bestial',
      target: 99,
    }).badges

    const badge = getMemberSeasonBadges(
      data,
      'member-sergio',
      activeScope,
    )!.find(({ definition }) => definition.id === 'ferocious')!

    expect(badge.definition.name).toBe('Bestial')
    expect(badge).toMatchObject({
      unlockedAt: undefined,
      progress: { current: 7, target: 99 },
    })
  })
})
