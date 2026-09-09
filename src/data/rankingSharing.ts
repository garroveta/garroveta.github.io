import type { CommunityRankingPlayer } from './rankingSelectors'
import type { CommunityRankingSeason } from '../domain/types'

export function formatCommunityRankingForWhatsApp({
  communityName,
  eventKindName,
  formatName,
  gameName,
  ranking,
  rankingUrl,
  season,
}: {
  communityName: string
  eventKindName?: string
  formatName?: string
  gameName: string
  ranking: CommunityRankingPlayer[]
  rankingUrl: string
  season: Pick<CommunityRankingSeason, 'name' | 'status'>
}) {
  const filters = [formatName, eventKindName].filter(Boolean)
  const leaders = ranking
    .slice(0, 5)
    .map(
      ({ member, points, rank }) =>
        `${rank}. ${member.displayName} · ${points} pts`,
    )
  const statusLabel =
    season.status === 'closed'
      ? 'Clasificación final'
      : 'Clasificación provisional'
  const playerLabel =
    ranking.length === 1 ? '1 jugador' : `${ranking.length} jugadores`

  return [
    `🏆 *Ranking ${gameName} · ${season.name}*`,
    filters.length > 0 ? `🎯 ${filters.join(' · ')}` : '',
    ...leaders,
    `📊 ${statusLabel} · ${playerLabel} · ${communityName}`,
    `🔗 Ver ranking completo: ${rankingUrl}`,
  ]
    .filter(Boolean)
    .join('\n')
}
