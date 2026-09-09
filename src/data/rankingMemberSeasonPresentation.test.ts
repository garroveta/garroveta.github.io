import { describe, expect, it } from 'vitest'

import {
  formatPlacement,
  formatPlacementLabel,
  formatRankDelta,
  formatSeasonProjection,
} from './rankingMemberSeasonPresentation'

describe('rankingMemberSeasonPresentation', () => {
  it('names every placement of the scale', () => {
    expect([1, 2, 3, 4, 5, 10, 11].map(formatPlacementLabel)).toEqual([
      'una victoria',
      'una final',
      'un podio',
      'un top 4',
      'un top 5',
      'un top 10',
      'una participación',
    ])
  })

  it('falls back to the participation label for any other placement', () => {
    expect(formatPlacementLabel(7)).toBe('una participación')
  })

  it('writes the places gained or lost in singular and plural', () => {
    expect([2, 1, 0, -1, -3].map(formatRankDelta)).toEqual([
      '+2 puestos',
      '+1 puesto',
      'Sin cambios',
      '−1 puesto',
      '−3 puestos',
    ])
  })

  it('phrases the projection differently once the member is ranked', () => {
    const projection = { placement: 10, points: 3, resultingRank: 4 }

    expect(formatSeasonProjection(projection, true)).toBe(
      'Con un top 10 subirías a la posición 4',
    )
    expect(formatSeasonProjection(projection, false)).toBe(
      'Con un top 10 entrarías en la posición 4',
    )
  })

  it('writes a placement as an ordinal', () => {
    expect(formatPlacement(3)).toBe('3.º')
  })
})
