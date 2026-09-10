import type { CommunityBadgeSettings, DemoDataSet } from '../domain/types'
import { SEASON_BADGES } from './rankingBadges'

const MAX_NAME_LENGTH = 40

/** Far above any sensible threshold, low enough to catch a typed mistake. */
const MAX_TARGET = 999

function isManager(data: DemoDataSet, memberId: string) {
  return data.members.some(
    ({ id, role }) => id === memberId && role === 'manager',
  )
}

/**
 * A setting may only rename a badge and move its threshold. The counter stays
 * in code because it is logic, and the description is generated from the
 * threshold so it can never contradict it.
 */
export function isCommunityBadgeSettingsValid(
  settings: CommunityBadgeSettings,
) {
  const catalogue = new Map(SEASON_BADGES.map((badge) => [badge.id, badge]))
  const ids = settings.badges.map(({ id }) => id)

  return (
    new Set(ids).size === ids.length &&
    settings.badges.every(({ id, name, target }) => {
      const definition = catalogue.get(id)
      const trimmedName = name.trim()

      if (
        !definition ||
        trimmedName.length < 1 ||
        trimmedName.length > MAX_NAME_LENGTH
      ) {
        return false
      }

      return definition.counter === undefined
        ? target === undefined
        : target !== undefined &&
            Number.isInteger(target) &&
            target >= 1 &&
            target <= MAX_TARGET
    })
  )
}

/**
 * Saving also writes the badges into the active season, the way the points
 * scale already does: raising a threshold must never take back a badge a
 * closed season already handed out.
 */
export function updateCommunityBadgeSettings(
  data: DemoDataSet,
  managerId: string,
  settings: CommunityBadgeSettings,
): DemoDataSet {
  if (!isManager(data, managerId) || !isCommunityBadgeSettingsValid(settings)) {
    return data
  }

  const badges = structuredClone(settings.badges)

  return {
    ...data,
    badgeSettings: { badges },
    rankingSeasons: data.rankingSeasons.map((season) =>
      season.status === 'active' ? { ...season, badges } : season,
    ),
  }
}
