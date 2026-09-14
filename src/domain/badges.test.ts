import { describe, expect, it } from 'vitest'

import { getBadgeLadders, getBadgeTiers, resolveSeasonBadges } from './badges'
describe('badge ladders', () => {
  const badges = resolveSeasonBadges()

  it('turns the catalogue into one ladder per counter', () => {
    const ladders = getBadgeLadders(badges)

    expect(ladders.map(({ id }) => id)).toEqual([
      'played',
      'topFour',
      'topFourStreak',
      'titles',
      'formats',
      'titleFormats',
      'bigWins',
      'finalRank',
    ])
    expect(ladders.flatMap(({ steps }) => steps)).toHaveLength(badges.length)
  })

  it('puts the gold on the hardest rung, whatever the ladder height', () => {
    const ladders = getBadgeLadders(badges)
    const tiersOf = (id: string) =>
      ladders
        .find((ladder) => ladder.id === id)!
        .steps.map(({ badge, tier }) => [badge.id, tier])

    expect(tiersOf('played')).toEqual([
      ['vigilance', 'bronze'],
      ['persist', 'silver'],
      ['saga', 'gold'],
    ])
    // Two rungs start at silver; a lone rung is the top of its own ladder.
    expect(tiersOf('topFour')).toEqual([
      ['ferocious', 'silver'],
      ['citys-blessing', 'gold'],
    ])
    expect(tiersOf('bigWins')).toEqual([['melee', 'gold']])
    // The final ranking reads from the widest place to the narrowest.
    expect(tiersOf('finalRank')).toEqual([
      ['paragon', 'silver'],
      ['monarch', 'gold'],
    ])
  })

  it('follows the thresholds in force rather than the catalogue order', () => {
    const swapped = resolveSeasonBadges({
      badges: [
        { id: 'vigilance', name: 'Vigilance', target: 40 },
        { id: 'saga', name: 'Saga', target: 5 },
      ],
    })

    expect(getBadgeTiers(swapped).get('vigilance')).toBe('gold')
    expect(getBadgeTiers(swapped).get('saga')).toBe('bronze')
  })
})
