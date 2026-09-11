import { type AuthEnv } from './auth'
import {
  authorizeApprovedManager,
  authorizeApprovedMember,
} from './authorization'
import { ApiRequestError, apiError, jsonResponse, readJsonBody } from './http'
import { parseStoredBadgeSettings } from './badge-settings'
import { snapshotBadgeSettings } from '../src/domain/badges'

const RESOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const POINT_FIELDS = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixthToTenth',
  'participation',
] as const

interface RankingSeasonRequestContext {
  context: ExecutionContext
  env: AuthEnv
  request: Request
}

export interface RankingSeasonRoute {
  communityId: string
  seasonId?: string
  kind: 'activate' | 'close' | 'collection' | 'season'
}

interface RankingSeasonPoints {
  first: number
  second: number
  third: number
  fourth: number
  fifth: number
  sixthToTenth: number
  participation: number
}

interface RankingSeasonInput {
  name: string
  startsOn: string
  endsOn: string
  points: RankingSeasonPoints
}

interface RankingSeasonRow {
  badges: string | null
  community_id: string
  eligible_member_ids: string | null
  ends_on: string
  id: string
  name: string
  points_fifth: number
  points_first: number
  points_fourth: number
  points_participation: number
  points_second: number
  points_sixth_to_tenth: number
  points_third: number
  starts_on: string
  status: 'active' | 'closed' | 'upcoming'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}

function parsePoints(value: unknown): RankingSeasonPoints {
  if (!isRecord(value)) {
    throw new ApiRequestError(
      400,
      'ranking_season_invalid',
      'points must be a JSON object.',
    )
  }

  const points = {} as RankingSeasonPoints

  for (const field of POINT_FIELDS) {
    const candidate = value[field]

    if (
      typeof candidate !== 'number' ||
      !Number.isInteger(candidate) ||
      candidate < 0 ||
      candidate > 100
    ) {
      throw new ApiRequestError(
        400,
        'ranking_season_invalid',
        `points.${field} must be an integer between 0 and 100.`,
      )
    }

    points[field] = candidate
  }

  const isNonIncreasing = POINT_FIELDS.every(
    (field, index) =>
      index === 0 || points[POINT_FIELDS[index - 1]!] >= points[field],
  )

  if (!isNonIncreasing) {
    throw new ApiRequestError(
      400,
      'ranking_season_invalid',
      'points must not increase from first place to participation.',
    )
  }

  return points
}

function parseRankingSeasonInput(value: unknown): RankingSeasonInput {
  if (!isRecord(value)) {
    throw new ApiRequestError(
      400,
      'ranking_season_invalid',
      'The request body must be a JSON object.',
    )
  }

  const name = typeof value.name === 'string' ? value.name.trim() : ''

  if (!name || name.length > 80) {
    throw new ApiRequestError(
      400,
      'ranking_season_invalid',
      'name must contain between 1 and 80 characters.',
    )
  }

  if (!isCalendarDate(value.startsOn) || !isCalendarDate(value.endsOn)) {
    throw new ApiRequestError(
      400,
      'ranking_season_invalid',
      'startsOn and endsOn must be calendar dates in YYYY-MM-DD format.',
    )
  }

  if (value.startsOn > value.endsOn) {
    throw new ApiRequestError(
      400,
      'ranking_season_invalid',
      'startsOn must not be after endsOn.',
    )
  }

  return {
    name,
    startsOn: value.startsOn,
    endsOn: value.endsOn,
    points: parsePoints(value.points),
  }
}

function parsePointsUpdateInput(value: unknown): RankingSeasonPoints {
  if (!isRecord(value) || !('points' in value)) {
    throw new ApiRequestError(
      400,
      'ranking_season_invalid',
      'The request body must contain points.',
    )
  }

  return parsePoints(value.points)
}

function toRankingSeason(row: RankingSeasonRow) {
  return {
    communityId: row.community_id,
    endsOn: row.ends_on,
    ...(row.status === 'closed'
      ? {
          eligibleMemberIds: JSON.parse(
            row.eligible_member_ids ?? '[]',
          ) as string[],
        }
      : {}),
    ...(row.badges
      ? { badges: parseStoredBadgeSettings(row.badges).badges }
      : {}),
    id: row.id,
    name: row.name,
    points: {
      fifth: row.points_fifth,
      first: row.points_first,
      fourth: row.points_fourth,
      participation: row.points_participation,
      second: row.points_second,
      sixthToTenth: row.points_sixth_to_tenth,
      third: row.points_third,
    },
    startsOn: row.starts_on,
    status: row.status,
  }
}

export function matchRankingSeasonRoute(
  pathname: string,
): RankingSeasonRoute | null {
  const collectionMatch = pathname.match(
    /^\/api\/communities\/([^/]+)\/ranking-seasons\/?$/,
  )
  const collectionCommunityId = collectionMatch?.[1]

  if (
    collectionCommunityId &&
    RESOURCE_ID_PATTERN.test(collectionCommunityId)
  ) {
    return { communityId: collectionCommunityId, kind: 'collection' }
  }

  const actionMatch = pathname.match(
    /^\/api\/communities\/([^/]+)\/ranking-seasons\/([^/]+)\/(activate|close)\/?$/,
  )

  if (actionMatch) {
    const [, communityId, seasonId, action] = actionMatch

    if (
      communityId &&
      seasonId &&
      RESOURCE_ID_PATTERN.test(communityId) &&
      RESOURCE_ID_PATTERN.test(seasonId)
    ) {
      return {
        communityId,
        kind: action as 'activate' | 'close',
        seasonId,
      }
    }
  }

  const seasonMatch = pathname.match(
    /^\/api\/communities\/([^/]+)\/ranking-seasons\/([^/]+)\/?$/,
  )
  const communityId = seasonMatch?.[1]
  const seasonId = seasonMatch?.[2]

  if (
    !communityId ||
    !seasonId ||
    !RESOURCE_ID_PATTERN.test(communityId) ||
    !RESOURCE_ID_PATTERN.test(seasonId)
  ) {
    return null
  }

  return { communityId, kind: 'season', seasonId }
}

async function listRankingSeasons(
  requestContext: RankingSeasonRequestContext,
  communityId: string,
) {
  const { results } = await requestContext.env.DB.prepare(
    `select
      id,
      community_id,
      name,
      starts_on,
      ends_on,
      status,
      points_first,
      points_second,
      points_third,
      points_fourth,
      points_fifth,
      points_sixth_to_tenth,
      points_participation,
      eligible_member_ids,
      badges
    from community_ranking_season
    where community_id = ?
    order by starts_on desc`,
  )
    .bind(communityId)
    .all<RankingSeasonRow>()

  return jsonResponse({ seasons: results.map(toRankingSeason) })
}

async function findOverlappingSeason(
  db: D1Database,
  communityId: string,
  startsOn: string,
  endsOn: string,
) {
  return db
    .prepare(
      `select id
      from community_ranking_season
      where community_id = ?
        and starts_on <= ?
        and ends_on >= ?
      limit 1`,
    )
    .bind(communityId, endsOn, startsOn)
    .first<{ id: string }>()
}

async function createRankingSeason(
  requestContext: RankingSeasonRequestContext,
  communityId: string,
) {
  const input = parseRankingSeasonInput(
    await readJsonBody(requestContext.request),
  )
  const overlapping = await findOverlappingSeason(
    requestContext.env.DB,
    communityId,
    input.startsOn,
    input.endsOn,
  )

  if (overlapping) {
    return apiError(
      409,
      'ranking_season_overlap',
      'This period overlaps an existing ranking season.',
    )
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const created = await requestContext.env.DB.prepare(
    `insert into community_ranking_season (
      id,
      community_id,
      name,
      starts_on,
      ends_on,
      status,
      points_first,
      points_second,
      points_third,
      points_fourth,
      points_fifth,
      points_sixth_to_tenth,
      points_participation,
      created_at,
      updated_at
    ) values (?, ?, ?, ?, ?, 'upcoming', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    returning
      id,
      community_id,
      name,
      starts_on,
      ends_on,
      status,
      points_first,
      points_second,
      points_third,
      points_fourth,
      points_fifth,
      points_sixth_to_tenth,
      points_participation,
      eligible_member_ids,
      badges`,
  )
    .bind(
      id,
      communityId,
      input.name,
      input.startsOn,
      input.endsOn,
      input.points.first,
      input.points.second,
      input.points.third,
      input.points.fourth,
      input.points.fifth,
      input.points.sixthToTenth,
      input.points.participation,
      now,
      now,
    )
    .first<RankingSeasonRow>()

  if (!created) {
    return apiError(
      500,
      'internal_error',
      'The ranking season could not be created.',
    )
  }

  return jsonResponse({ season: toRankingSeason(created) }, { status: 201 })
}

async function updateRankingSeasonPoints(
  requestContext: RankingSeasonRequestContext,
  communityId: string,
  seasonId: string,
) {
  const points = parsePointsUpdateInput(
    await readJsonBody(requestContext.request),
  )
  const now = new Date().toISOString()

  const updated = await requestContext.env.DB.prepare(
    `update community_ranking_season
    set points_first = ?,
        points_second = ?,
        points_third = ?,
        points_fourth = ?,
        points_fifth = ?,
        points_sixth_to_tenth = ?,
        points_participation = ?,
        updated_at = ?
    where id = ? and community_id = ? and status != 'closed'
    returning
      id,
      community_id,
      name,
      starts_on,
      ends_on,
      status,
      points_first,
      points_second,
      points_third,
      points_fourth,
      points_fifth,
      points_sixth_to_tenth,
      points_participation,
      eligible_member_ids,
      badges`,
  )
    .bind(
      points.first,
      points.second,
      points.third,
      points.fourth,
      points.fifth,
      points.sixthToTenth,
      points.participation,
      now,
      seasonId,
      communityId,
    )
    .first<RankingSeasonRow>()

  if (!updated) {
    return apiError(
      409,
      'ranking_season_not_editable',
      'This ranking season cannot be edited.',
    )
  }

  return jsonResponse({ season: toRankingSeason(updated) })
}

async function deleteUpcomingRankingSeason(
  requestContext: RankingSeasonRequestContext,
  communityId: string,
  seasonId: string,
) {
  const deleted = await requestContext.env.DB.prepare(
    `delete from community_ranking_season
    where id = ? and community_id = ? and status = 'upcoming'
    returning id`,
  )
    .bind(seasonId, communityId)
    .first<{ id: string }>()

  if (!deleted) {
    return apiError(
      409,
      'ranking_season_not_deletable',
      'Only an upcoming ranking season can be deleted.',
    )
  }

  return jsonResponse({ deletedSeasonId: deleted.id })
}

async function activateRankingSeason(
  requestContext: RankingSeasonRequestContext,
  communityId: string,
  seasonId: string,
) {
  const season = await requestContext.env.DB.prepare(
    `select status from community_ranking_season
    where id = ? and community_id = ?
    limit 1`,
  )
    .bind(seasonId, communityId)
    .first<{ status: string }>()

  if (!season) {
    return apiError(404, 'ranking_season_not_found', 'Season not found.')
  }

  if (season.status !== 'upcoming') {
    return apiError(
      409,
      'ranking_season_not_upcoming',
      'Only an upcoming season can be activated.',
    )
  }

  const activeSeason = await requestContext.env.DB.prepare(
    `select id from community_ranking_season
    where community_id = ? and status = 'active'
    limit 1`,
  )
    .bind(communityId)
    .first<{ id: string }>()

  if (activeSeason) {
    return apiError(
      409,
      'ranking_season_already_active',
      'Close the active season before activating this one.',
    )
  }

  const now = new Date().toISOString()

  const activated = await requestContext.env.DB.prepare(
    `update community_ranking_season
    set status = 'active', updated_at = ?
    where id = ? and community_id = ? and status = 'upcoming'
    returning
      id,
      community_id,
      name,
      starts_on,
      ends_on,
      status,
      points_first,
      points_second,
      points_third,
      points_fourth,
      points_fifth,
      points_sixth_to_tenth,
      points_participation,
      eligible_member_ids,
      badges`,
  )
    .bind(now, seasonId, communityId)
    .first<RankingSeasonRow>()

  if (!activated) {
    return apiError(
      409,
      'ranking_season_already_active',
      'Close the active season before activating this one.',
    )
  }

  return jsonResponse({ season: toRankingSeason(activated) })
}

async function closeRankingSeason(
  requestContext: RankingSeasonRequestContext,
  communityId: string,
  seasonId: string,
) {
  const { results: eligibleMembers } = await requestContext.env.DB.prepare(
    `select id from community_member
    where community_id = ? and status = 'approved'`,
  )
    .bind(communityId)
    .all<{ id: string }>()
  const eligibleMemberIds = JSON.stringify(eligibleMembers.map(({ id }) => id))
  const community = await requestContext.env.DB.prepare(
    `select badge_settings from community where id = ? limit 1`,
  )
    .bind(communityId)
    .first<{ badge_settings: string }>()
  // A season that never had its badges frozen on a settings save gets them
  // frozen now; one that had keeps them, whatever the settings say today.
  const frozenBadges = JSON.stringify(
    snapshotBadgeSettings(parseStoredBadgeSettings(community?.badge_settings)),
  )
  const now = new Date().toISOString()

  const closed = await requestContext.env.DB.prepare(
    `update community_ranking_season
    set status = 'closed',
        eligible_member_ids = ?,
        badges = coalesce(badges, ?),
        updated_at = ?
    where id = ? and community_id = ? and status = 'active'
    returning
      id,
      community_id,
      name,
      starts_on,
      ends_on,
      status,
      points_first,
      points_second,
      points_third,
      points_fourth,
      points_fifth,
      points_sixth_to_tenth,
      points_participation,
      eligible_member_ids,
      badges`,
  )
    .bind(eligibleMemberIds, frozenBadges, now, seasonId, communityId)
    .first<RankingSeasonRow>()

  if (!closed) {
    return apiError(
      409,
      'ranking_season_not_active',
      'Only the active season can be closed.',
    )
  }

  return jsonResponse({ season: toRankingSeason(closed) })
}

export async function handleRankingSeasonApiRequest(
  requestContext: RankingSeasonRequestContext,
  route: RankingSeasonRoute,
) {
  const method = requestContext.request.method
  const allowedMethods =
    route.kind === 'collection'
      ? ['GET', 'POST']
      : route.kind === 'season'
        ? ['DELETE', 'PATCH']
        : ['POST']

  if (!allowedMethods.includes(method)) {
    return apiError(
      405,
      'method_not_allowed',
      `This endpoint only accepts ${allowedMethods.join(' or ')} requests.`,
      { Allow: allowedMethods.join(', ') },
    )
  }

  try {
    if (route.kind === 'collection' && method === 'GET') {
      const authorization = await authorizeApprovedMember(
        requestContext,
        route.communityId,
      )

      if (!authorization.authorized) {
        return authorization.response
      }

      return await listRankingSeasons(requestContext, route.communityId)
    }

    const authorization = await authorizeApprovedManager(
      requestContext,
      route.communityId,
    )

    if (!authorization.authorized) {
      return authorization.response
    }

    if (route.kind === 'collection') {
      return await createRankingSeason(requestContext, route.communityId)
    }

    if (route.kind === 'activate') {
      return await activateRankingSeason(
        requestContext,
        route.communityId,
        route.seasonId!,
      )
    }

    if (route.kind === 'close') {
      return await closeRankingSeason(
        requestContext,
        route.communityId,
        route.seasonId!,
      )
    }

    return method === 'DELETE'
      ? await deleteUpcomingRankingSeason(
          requestContext,
          route.communityId,
          route.seasonId!,
        )
      : await updateRankingSeasonPoints(
          requestContext,
          route.communityId,
          route.seasonId!,
        )
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return apiError(error.status, error.code, error.message)
    }

    throw error
  }
}
