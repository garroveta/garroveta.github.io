import type {
  CommunityMember,
  CommunityRankingPoints,
  CommunityRankingSeason,
  DemoDataSet,
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

function isManager(data: DemoDataSet, memberId: string) {
  return data.members.some(
    ({ id, role }) => id === memberId && role === 'manager',
  )
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

function createRankingSeasonId(data: DemoDataSet, name: string) {
  const baseId = `ranking-season-${slugify(name) || 'temporada'}`
  let candidateId = baseId
  let suffix = 2

  while (data.rankingSeasons.some(({ id }) => id === candidateId)) {
    candidateId = `${baseId}-${suffix}`
    suffix += 1
  }

  return candidateId
}

export type RankingSeasonInput = {
  name: string
  startsOn: string
  endsOn: string
  points: CommunityRankingPoints
}

export function createRankingSeason(
  data: DemoDataSet,
  managerId: string,
  input: RankingSeasonInput,
): DemoDataSet {
  if (!isManager(data, managerId)) {
    return data
  }

  const season: CommunityRankingSeason = {
    id: createRankingSeasonId(data, input.name),
    communityId: data.community.id,
    name: input.name.trim(),
    startsOn: input.startsOn,
    endsOn: input.endsOn,
    points: structuredClone(input.points),
    status: 'upcoming',
  }
  const nextSeasons = [...data.rankingSeasons, season]

  if (!areRankingSeasonsValid(nextSeasons)) {
    return data
  }

  return { ...data, rankingSeasons: nextSeasons }
}

export function deleteUpcomingRankingSeason(
  data: DemoDataSet,
  managerId: string,
  seasonId: string,
): DemoDataSet {
  if (!isManager(data, managerId)) {
    return data
  }

  const season = data.rankingSeasons.find(({ id }) => id === seasonId)

  if (!season || season.status !== 'upcoming') {
    return data
  }

  return {
    ...data,
    rankingSeasons: data.rankingSeasons.filter(({ id }) => id !== seasonId),
  }
}

export function activateRankingSeason(
  data: DemoDataSet,
  managerId: string,
  seasonId: string,
): DemoDataSet {
  if (!isManager(data, managerId)) {
    return data
  }

  const season = data.rankingSeasons.find(({ id }) => id === seasonId)
  const hasActiveSeason = data.rankingSeasons.some(
    ({ status }) => status === 'active',
  )

  if (!season || season.status !== 'upcoming' || hasActiveSeason) {
    return data
  }

  const activatedSeason = { ...season, status: 'active' as const }

  return {
    ...data,
    rankingSeasons: data.rankingSeasons.map((current) =>
      current.id === seasonId ? activatedSeason : current,
    ),
  }
}

export function closeActiveRankingSeason(
  data: DemoDataSet,
  managerId: string,
  seasonId: string,
): DemoDataSet {
  if (!isManager(data, managerId)) {
    return data
  }

  const season = data.rankingSeasons.find(({ id }) => id === seasonId)

  if (!season || season.status !== 'active') {
    return data
  }

  const eligibleMemberIds = [
    ...getEligibleRankingMemberIds(season, data.members),
  ]
  const closedSeason = closeRankingSeason(season, eligibleMemberIds)

  return {
    ...data,
    rankingSeasons: data.rankingSeasons.map((current) =>
      current.id === seasonId ? closedSeason : current,
    ),
  }
}
