import type { MemberSeasonProjection } from './rankingMemberSeason'

const PLACEMENT_LABELS: Record<number, string> = {
  1: 'una victoria',
  2: 'una final',
  3: 'un podio',
  4: 'un top 4',
  5: 'un top 5',
  10: 'un top 10',
  11: 'una participación',
}

export function formatPlacement(rank: number) {
  return `${rank}.º`
}

export function formatPlacementLabel(placement: number) {
  return PLACEMENT_LABELS[placement] ?? PLACEMENT_LABELS[11]
}

export function formatRankDelta(delta: number) {
  const places = Math.abs(delta) === 1 ? 'puesto' : 'puestos'

  if (delta > 0) {
    return `+${delta} ${places}`
  }

  return delta < 0 ? `−${Math.abs(delta)} ${places}` : 'Sin cambios'
}

/** Whether the panel talks to the member or about them. */
export type SeasonPerspective = 'self' | 'other'

/**
 * The projection assumes the other players do not score, so it is phrased as a
 * possibility and never as a guaranteed place.
 */
export function formatSeasonProjection(
  projection: MemberSeasonProjection,
  isRanked: boolean,
  perspective: SeasonPerspective = 'self',
) {
  const label = formatPlacementLabel(projection.placement)
  const verb = isRanked
    ? perspective === 'self'
      ? 'subirías a'
      : 'subiría a'
    : perspective === 'self'
      ? 'entrarías en'
      : 'entraría en'

  return `Con ${label} ${verb} la posición ${projection.resultingRank}`
}
