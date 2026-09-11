import type { MemberBadge } from './rankingBadges'
import type { MemberSeasonSummary } from './rankingMemberSeason'
import type { CommunityMember, CommunityRankingSeason } from '../domain/types'

/** A showcase, not an inventory: past this the rest is counted, not listed. */
const MAX_SHOWCASED_BADGES = 5

/**
 * A member's card for WhatsApp: who they are this season and the badges they
 * can show for it. Written in the third person so anyone can relay it.
 */
export function formatMemberProfileForWhatsApp({
  badges,
  communityName,
  member,
  profileUrl,
  season,
  summary,
}: {
  badges: MemberBadge[]
  communityName: string
  member: Pick<CommunityMember, 'displayName'>
  profileUrl: string
  season: Pick<CommunityRankingSeason, 'name'>
  summary?: MemberSeasonSummary
}) {
  const unlocked = badges.filter(({ unlockedAt }) => unlockedAt)
  const shown = unlocked.slice(0, MAX_SHOWCASED_BADGES)
  const remaining = unlocked.length - shown.length
  const player = summary?.player
  const seasonLine = player
    ? `📊 ${season.name} · Posición ${player.rank} · ${player.points} puntos comunidad · ${
        player.eventsPlayed === 1
          ? '1 evento'
          : `${player.eventsPlayed} eventos`
      }`
    : `📊 ${season.name} · todavía sin clasificar`

  return [
    `🏅 *${member.displayName}* · ${communityName}`,
    seasonLine,
    unlocked.length === 0
      ? '🎖️ Todavía sin insignias esta temporada'
      : `🎖️ Insignias (${unlocked.length} de ${badges.length})`,
    ...shown.map(
      ({ definition }) => `• ${definition.name} — ${definition.description}`,
    ),
    remaining > 0
      ? remaining === 1
        ? '• y 1 más'
        : `• y ${remaining} más`
      : '',
    `🔗 Ver la ficha: ${profileUrl}`,
  ]
    .filter(Boolean)
    .join('\n')
}
