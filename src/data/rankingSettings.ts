import type { CommunityRankingSettings, DemoDataSet } from '../domain/types'

export type CommunityRankingSettingsInput = CommunityRankingSettings

export const DEFAULT_COMMUNITY_RANKING_SETTINGS: CommunityRankingSettings = {
  points: {
    first: 10,
    second: 8,
    third: 6,
    fourth: 5,
    fifth: 4,
    sixthToTenth: 3,
    participation: 1,
  },
  defaultPeriodMonths: 6,
  defaultLimit: 10,
}

function isManager(data: DemoDataSet, memberId: string) {
  return data.members.some(
    ({ id, role }) => id === memberId && role === 'manager',
  )
}

export function isCommunityRankingSettingsValid(
  settings: CommunityRankingSettings,
) {
  const values = [
    settings.points.first,
    settings.points.second,
    settings.points.third,
    settings.points.fourth,
    settings.points.fifth,
    settings.points.sixthToTenth,
    settings.points.participation,
  ]

  return (
    values.every(
      (value) => Number.isInteger(value) && value >= 0 && value <= 100,
    ) &&
    values.every((value, index) => index === 0 || values[index - 1] >= value)
  )
}

export function getCommunityPoints(rank: number): number
export function getCommunityPoints(
  rank: number,
  settings: CommunityRankingSettings,
): number
export function getCommunityPoints(
  rank: number,
  settings:
    CommunityRankingSettings | number = DEFAULT_COMMUNITY_RANKING_SETTINGS,
) {
  const resolvedSettings =
    typeof settings === 'number' ? DEFAULT_COMMUNITY_RANKING_SETTINGS : settings

  if (rank === 1) return resolvedSettings.points.first
  if (rank === 2) return resolvedSettings.points.second
  if (rank === 3) return resolvedSettings.points.third
  if (rank === 4) return resolvedSettings.points.fourth
  if (rank === 5) return resolvedSettings.points.fifth
  if (rank <= 10) return resolvedSettings.points.sixthToTenth
  return resolvedSettings.points.participation
}

export function updateCommunityRankingSettings(
  data: DemoDataSet,
  managerId: string,
  settings: CommunityRankingSettingsInput,
): DemoDataSet {
  if (
    !isManager(data, managerId) ||
    !isCommunityRankingSettingsValid(settings)
  ) {
    return data
  }

  return {
    ...data,
    rankingSettings: structuredClone(settings),
  }
}
