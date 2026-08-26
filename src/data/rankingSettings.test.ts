import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import {
  getCommunityPoints,
  updateCommunityRankingSettings,
} from './rankingSettings'

describe('community ranking settings', () => {
  it('lets the manager update the barometer and ranking defaults', () => {
    const settings = {
      points: {
        first: 12,
        second: 9,
        third: 7,
        fourth: 5,
        fifth: 4,
        sixthToTenth: 2,
        participation: 1,
      },
      defaultPeriodMonths: 12 as const,
      defaultLimit: 'all' as const,
    }
    const updated = updateCommunityRankingSettings(
      structuredClone(demoData),
      'member-lucia',
      settings,
    )

    expect(updated.rankingSettings).toEqual(settings)
    expect(getCommunityPoints(1, updated.rankingSettings)).toBe(12)
    expect(getCommunityPoints(8, updated.rankingSettings)).toBe(2)
    expect(getCommunityPoints(18, updated.rankingSettings)).toBe(1)
  })

  it('rejects players and incoherent point scales', () => {
    const playerAttempt = updateCommunityRankingSettings(
      demoData,
      'member-alex',
      demoData.rankingSettings,
    )
    const invalidAttempt = updateCommunityRankingSettings(
      demoData,
      'member-lucia',
      {
        ...demoData.rankingSettings,
        points: { ...demoData.rankingSettings.points, second: 20 },
      },
    )

    expect(playerAttempt).toBe(demoData)
    expect(invalidAttempt).toBe(demoData)
  })
})
