import type { BadgeUnlock } from './rankingBadges'
import type { CommunityRankingSeason } from '../domain/types'

/** A results message stays readable; past this the unlocks are summarised. */
const MAX_SHARED_UNLOCKS = 4

export function formatBadgeUnlockForWhatsApp({
  communityName,
  badgeUrl,
  season,
  unlock,
}: {
  communityName: string
  badgeUrl: string
  season: Pick<CommunityRankingSeason, 'name'>
  unlock: BadgeUnlock
}) {
  return [
    `🏅 *${unlock.member.displayName} ha desbloqueado ${unlock.definition.name}*`,
    unlock.definition.description,
    `🗓️ ${season.name} · ${communityName}`,
    `🔗 Ver las insignias: ${badgeUrl}`,
  ].join('\n')
}

/**
 * The lines a results message adds when an event handed out badges. Returns
 * nothing when it handed out none, so the caller never appends an empty block.
 */
export function formatEventBadgeUnlocksForWhatsApp(unlocks: BadgeUnlock[]) {
  if (unlocks.length === 0) {
    return ''
  }

  const shown = unlocks.slice(0, MAX_SHARED_UNLOCKS)
  const remaining = unlocks.length - shown.length

  return [
    unlocks.length === 1
      ? '🏅 *Insignia desbloqueada*'
      : `🏅 *${unlocks.length} insignias desbloqueadas*`,
    ...shown.map(
      ({ definition, member }) =>
        `• ${member.displayName} — ${definition.name}`,
    ),
    remaining > 0
      ? remaining === 1
        ? '• y 1 más'
        : `• y ${remaining} más`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}
