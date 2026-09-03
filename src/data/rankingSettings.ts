import type {
  CommunityRankingPoints,
  CommunityRankingSettings,
  DemoDataSet,
} from '../domain/types'

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
  settings: CommunityRankingSettings | CommunityRankingPoints,
): number
export function getCommunityPoints(
  rank: number,
  settings:
    | CommunityRankingSettings
    | CommunityRankingPoints
    | number = DEFAULT_COMMUNITY_RANKING_SETTINGS,
) {
  const resolvedPoints =
    typeof settings === 'number'
      ? DEFAULT_COMMUNITY_RANKING_SETTINGS.points
      : 'points' in settings
        ? settings.points
        : settings

  if (rank === 1) return resolvedPoints.first
  if (rank === 2) return resolvedPoints.second
  if (rank === 3) return resolvedPoints.third
  if (rank === 4) return resolvedPoints.fourth
  if (rank === 5) return resolvedPoints.fifth
  if (rank <= 10) return resolvedPoints.sixthToTenth
  return resolvedPoints.participation
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

  const points = structuredClone(settings.points)

  return {
    ...data,
    rankingSettings: structuredClone(settings),
    rankingSeasons: data.rankingSeasons.map((season) =>
      season.status === 'active' ? { ...season, points } : season,
    ),
  }
}
