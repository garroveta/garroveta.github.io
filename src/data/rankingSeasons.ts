import type {
  CommunityMember,
  CommunityRankingSeason,
  EntityId,
} from '../domain/types'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isCalendarDate(value: string) {
  if (!DATE_PATTERN.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}

export function isRankingSeasonValid(season: CommunityRankingSeason) {
  const pointValues = [
    season.points.first,
    season.points.second,
    season.points.third,
    season.points.fourth,
    season.points.fifth,
    season.points.sixthToTenth,
    season.points.participation,
  ]

  return (
    season.name.trim().length >= 1 &&
    season.name.trim().length <= 80 &&
    isCalendarDate(season.startsOn) &&
    isCalendarDate(season.endsOn) &&
    season.startsOn <= season.endsOn &&
    pointValues.every(
      (value) => Number.isInteger(value) && value >= 0 && value <= 100,
    ) &&
    pointValues.every(
      (value, index) => index === 0 || pointValues[index - 1] >= value,
    ) &&
    (season.status !== 'closed' ||
      new Set(season.eligibleMemberIds).size ===
        season.eligibleMemberIds.length)
  )
}

export function areRankingSeasonsValid(seasons: CommunityRankingSeason[]) {
  const seasonIds = new Set(seasons.map(({ id }) => id))
  const orderedSeasons = [...seasons].sort((first, second) =>
    first.startsOn.localeCompare(second.startsOn),
  )
  const periodsDoNotOverlap = orderedSeasons.every(
    (season, index) =>
      index === 0 || orderedSeasons[index - 1].endsOn < season.startsOn,
  )

  return (
    seasons.length > 0 &&
    seasonIds.size === seasons.length &&
    seasons.every(isRankingSeasonValid) &&
    seasons.filter(({ status }) => status === 'active').length <= 1 &&
    periodsDoNotOverlap
  )
}

export function getRankingSeasonForDate(
  seasons: CommunityRankingSeason[],
  isoDateTime: string,
) {
  const eventDate = isoDateTime.slice(0, 10)

  return seasons.find(
    ({ startsOn, endsOn }) => eventDate >= startsOn && eventDate <= endsOn,
  )
}

export function canAssociateMemberWithSeason(season: CommunityRankingSeason) {
  return season.status !== 'closed'
}

export function getEligibleRankingMemberIds(
  season: CommunityRankingSeason,
  members: CommunityMember[],
) {
  return new Set<EntityId>(
    season.status === 'closed'
      ? season.eligibleMemberIds
      : members
          .filter(({ status }) => status === 'approved')
          .map(({ id }) => id),
  )
}

export function closeRankingSeason(
  season: CommunityRankingSeason,
  eligibleMemberIds: EntityId[],
): CommunityRankingSeason {
  if (season.status !== 'active') {
    return season
  }

  return {
    ...season,
    status: 'closed',
    eligibleMemberIds: [...new Set(eligibleMemberIds)],
  }
}
