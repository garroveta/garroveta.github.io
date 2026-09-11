import { describe, expect, it } from 'vitest'

import { demoData } from './demoData'
import { formatMemberProfileForWhatsApp } from './memberSharing'
import { getMemberSeasonBadges } from './rankingBadges'
import { getMemberSeasonSummary } from './rankingMemberSeason'

const scope = { gameId: 'game-mtg', seasonId: 'ranking-season-2026' }
const season = demoData.rankingSeasons.find(({ id }) => id === scope.seasonId)!
const profileUrl = 'https://garroveta.test/#miembro?id=member-sergio'

function cardOf(memberId: string) {
  const member = demoData.members.find(({ id }) => id === memberId)!

  return formatMemberProfileForWhatsApp({
    badges: getMemberSeasonBadges(demoData, memberId, scope)!,
    communityName: demoData.community.name,
    member,
    profileUrl,
    season,
    summary: getMemberSeasonSummary(demoData, memberId, scope),
  })
}

describe('memberSharing', () => {
  it('leads with the member, then their season, then their badges', () => {
    const card = cardOf('member-sergio')
    const lines = card.split('\n')

    expect(lines[0]).toBe('🏅 *Sergio Gil* · CRC Delorean')
    expect(lines[1]).toBe(
      '📊 Temporada 2026 · Posición 1 · 55 puntos comunidad · 8 eventos',
    )
    expect(lines[2]).toBe('🎖️ Insignias (4 de 16)')
    expect(lines.at(-1)).toBe(`🔗 Ver la ficha: ${profileUrl}`)
  })

  it('showcases each unlocked badge with what it took', () => {
    const card = cardOf('member-sergio')

    expect(card).toContain('• Ferocious — Termina 4 veces en el Top 4')
    expect(card).toContain('• Vigilance — Juega 6 eventos puntuables')
    expect(card).not.toContain('Legendary')
  })

  it('reads well for a member who has nothing to show yet', () => {
    const card = cardOf('member-lucia')

    expect(card).toContain('todavía sin clasificar')
    expect(card).toContain('Todavía sin insignias esta temporada')
    expect(card).not.toContain('•')
  })

  it('counts the tail instead of listing every badge', () => {
    const badges = getMemberSeasonBadges(demoData, 'member-sergio', scope)!
    const everything = badges.map((badge) => ({
      ...badge,
      unlockedAt: badge.unlockedAt ?? '2026-08-02T21:30:00+02:00',
    }))
    const card = formatMemberProfileForWhatsApp({
      badges: everything,
      communityName: 'CRC Delorean',
      member: { displayName: 'Sergio Gil' },
      profileUrl,
      season,
    })

    expect(card).toContain('🎖️ Insignias (16 de 16)')
    expect(
      card.split('\n').filter((line) => line.startsWith('• ')),
    ).toHaveLength(6)
    expect(card).toContain('• y 11 más')
  })
})
