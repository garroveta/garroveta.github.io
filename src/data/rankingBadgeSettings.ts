import { isCommunityBadgeSettingsValid } from '../domain/badges'
import type { CommunityBadgeSettings, DemoDataSet } from '../domain/types'

/**
 * Saving also writes the badges into the active season, the way the points
 * scale already does: raising a threshold must never take back a badge a
 * closed season already handed out.
 *
 * Who may save is not checked here: the demo simulates the manager role in the
 * app shell rather than on a member row, so a member lookup would refuse every
 * real caller. The settings navigation gates it today, and the Worker must own
 * it once these settings are persisted.
 */
export function updateCommunityBadgeSettings(
  data: DemoDataSet,
  settings: CommunityBadgeSettings,
): DemoDataSet {
  if (!isCommunityBadgeSettingsValid(settings)) {
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
