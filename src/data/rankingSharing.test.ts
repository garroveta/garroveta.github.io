import { describe, expect, it } from 'vitest'

import { formatCommunityRankingForWhatsApp } from './rankingSharing'
import type { CommunityRankingPlayer } from './rankingSelectors'

function buildPlayer(rank: number): CommunityRankingPlayer {
  return {
    bestRank: rank,
    eventsPlayed: 3,
    eventWins: Number(rank === 1),
    latestResultAt: '2026-09-01T18:00:00.000Z',
    member: {
      communityId: 'community-crc-delorean',
      contactMethods: [],
      displayName: `Jugador ${rank}`,
      favoriteGameIds: ['game-mtg'],
      id: `member-${rank}`,
      initials: `J${rank}`,
      joinedAt: '2026-01-01T10:00:00.000Z',
      role: 'player',
      status: 'approved',
      tagIds: [],
    },
    podiums: Number(rank <= 3),
    points: 50 - rank,
    rank,
  }
}

describe('community ranking sharing', () => {
  it('shares the filtered top five and the full number of ranked players', () => {
    const message = formatCommunityRankingForWhatsApp({
      communityName: 'CRC Delorean',
      eventKindName: 'Friday Night Magic',
      formatName: 'Standard',
      gameName: 'MTG',
      ranking: Array.from({ length: 8 }, (_, index) => buildPlayer(index + 1)),
      rankingUrl:
        'https://www.garroveta.es/#ranking?view=community&season=season-autumn&game=game-mtg',
      season: { name: 'Otoño 2026', status: 'active' },
    })

    expect(message).toBe(
      [
        '🏆 *Ranking MTG · Otoño 2026*',
        '🎯 Standard · Friday Night Magic',
        '1. Jugador 1 · 49 pts',
        '2. Jugador 2 · 48 pts',
        '3. Jugador 3 · 47 pts',
        '4. Jugador 4 · 46 pts',
        '5. Jugador 5 · 45 pts',
        '📊 Clasificación provisional · 8 jugadores · CRC Delorean',
        '🔗 Ver ranking completo: https://www.garroveta.es/#ranking?view=community&season=season-autumn&game=game-mtg',
      ].join('\n'),
    )
    expect(message).not.toContain('Jugador 6')
  })

  it('labels a closed season as a final classification', () => {
    expect(
      formatCommunityRankingForWhatsApp({
        communityName: 'CRC Delorean',
        gameName: 'MTG',
        ranking: [buildPlayer(1)],
        rankingUrl: 'https://www.garroveta.es/#ranking',
        season: { name: 'Primavera 2026', status: 'closed' },
      }),
    ).toContain('📊 Clasificación final · 1 jugador · CRC Delorean')
  })
})
