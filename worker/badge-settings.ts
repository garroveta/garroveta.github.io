import { type AuthEnv } from './auth'
import {
  authorizeApprovedManager,
  authorizeApprovedMember,
} from './authorization'
import { ApiRequestError, apiError, jsonResponse, readJsonBody } from './http'
import { isCommunityBadgeSettingsValid } from '../src/domain/badges'
import type {
  CommunityBadgeSetting,
  CommunityBadgeSettings,
} from '../src/domain/types'

const RESOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/

interface BadgeSettingsRequestContext {
  context: ExecutionContext
  env: AuthEnv
  request: Request
}

export interface BadgeSettingsRoute {
  communityId: string
}

interface BadgeSettingsRow {
  badge_settings: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Only the shape is checked here; the rules a setting must follow live in the
 * shared domain module, so the Worker refuses exactly what the panel refuses.
 */
function parseBadgeSettingsInput(value: unknown): CommunityBadgeSettings {
  if (!isRecord(value) || !Array.isArray(value.badges)) {
    throw new ApiRequestError(
      400,
      'badge_settings_invalid',
      'badges must be an array.',
    )
  }

  const badges = value.badges.map((entry): CommunityBadgeSetting => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== 'string' ||
      typeof entry.name !== 'string' ||
      (entry.target !== undefined && typeof entry.target !== 'number')
    ) {
      throw new ApiRequestError(
        400,
        'badge_settings_invalid',
        'Each badge needs an id, a name and an optional numeric target.',
      )
    }

    return entry.target === undefined
      ? { id: entry.id, name: entry.name.trim() }
      : { id: entry.id, name: entry.name.trim(), target: entry.target }
  })

  const settings = { badges }

  if (!isCommunityBadgeSettingsValid(settings)) {
    throw new ApiRequestError(
      400,
      'badge_settings_invalid',
      'Badge settings do not match the catalogue or its limits.',
    )
  }

  return settings
}

export function parseStoredBadgeSettings(
  raw: string | null | undefined,
): CommunityBadgeSettings {
  try {
    const parsed: unknown = JSON.parse(raw ?? '[]')

    return Array.isArray(parsed)
      ? parseBadgeSettingsInput({ badges: parsed })
      : { badges: [] }
  } catch {
    return { badges: [] }
  }
}

export function matchBadgeSettingsRoute(
  pathname: string,
): BadgeSettingsRoute | null {
  const match = pathname.match(
    /^\/api\/communities\/([^/]+)\/badge-settings\/?$/,
  )
  const communityId = match?.[1]

  return communityId && RESOURCE_ID_PATTERN.test(communityId)
    ? { communityId }
    : null
}

async function getBadgeSettings(
  requestContext: BadgeSettingsRequestContext,
  communityId: string,
) {
  const row = await requestContext.env.DB.prepare(
    `select badge_settings from community where id = ? limit 1`,
  )
    .bind(communityId)
    .first<BadgeSettingsRow>()

  if (!row) {
    return apiError(404, 'community_not_found', 'Community not found.')
  }

  return jsonResponse({
    badgeSettings: parseStoredBadgeSettings(row.badge_settings),
  })
}

/**
 * Saving writes the settings and freezes them into the active season in one
 * batch, the way the points scale works: a threshold raised mid-season must
 * never take back a badge the season already handed out.
 */
async function updateBadgeSettings(
  requestContext: BadgeSettingsRequestContext,
  communityId: string,
  managerMemberId: string,
) {
  const settings = parseBadgeSettingsInput(
    await readJsonBody(requestContext.request, 16_384),
  )
  const serialized = JSON.stringify(settings.badges)
  const now = new Date().toISOString()
  const db = requestContext.env.DB
  const [updated] = await db.batch([
    db
      .prepare(
        `update community
        set badge_settings = ?, updated_at = ?
        where id = ?
        returning badge_settings`,
      )
      .bind(serialized, now, communityId),
    db
      .prepare(
        `update community_ranking_season
        set badges = ?, updated_at = ?
        where community_id = ? and status = 'active'`,
      )
      .bind(serialized, now, communityId),
  ])

  if (!updated?.results?.length) {
    return apiError(404, 'community_not_found', 'Community not found.')
  }

  console.info(
    JSON.stringify({
      actorMemberId: managerMemberId,
      communityId,
      event: 'community.badge_settings_updated',
    }),
  )

  return jsonResponse({ badgeSettings: settings })
}

export async function handleBadgeSettingsApiRequest(
  requestContext: BadgeSettingsRequestContext,
  route: BadgeSettingsRoute,
) {
  const method = requestContext.request.method

  if (method !== 'GET' && method !== 'PATCH') {
    return apiError(
      405,
      'method_not_allowed',
      'This endpoint only accepts GET or PATCH requests.',
      { Allow: 'GET, PATCH' },
    )
  }

  try {
    const authorization =
      method === 'GET'
        ? await authorizeApprovedMember(requestContext, route.communityId)
        : await authorizeApprovedManager(requestContext, route.communityId)

    if (!authorization.authorized) {
      return authorization.response
    }

    return method === 'GET'
      ? await getBadgeSettings(requestContext, route.communityId)
      : await updateBadgeSettings(
          requestContext,
          route.communityId,
          authorization.value.membership.id,
        )
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return apiError(error.status, error.code, error.message)
    }

    throw error
  }
}
