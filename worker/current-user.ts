import { type AuthEnv } from './auth'
import { getAuthenticatedUser } from './authorization'
import { ApiRequestError, apiError, jsonResponse, readJsonBody } from './http'

const MAX_DISPLAY_NAME_LENGTH = 80
const RESOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/

interface CurrentUserRequestContext {
  context: ExecutionContext
  env: AuthEnv
  request: Request
}

interface CurrentMembershipRow {
  city: string
  community_id: string
  community_name: string
  community_slug: string
  display_name: string
  favorite_game_ids: string
  id: string
  joined_at: string
  role: 'manager' | 'moderator' | 'player'
  status: 'approved' | 'pending' | 'suspended'
  tag_ids: string
}

interface UpdateCurrentMembershipInput {
  communityId: string
  displayName: string
  favoriteGameIds: string[]
  tagIds: string[]
}

interface UpdatedMembershipRow {
  community_id: string
  display_name: string
  favorite_game_ids: string
  id: string
  tag_ids: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseResourceIds(value: unknown, fieldName: string) {
  if (
    !Array.isArray(value) ||
    value.length > 100 ||
    value.some(
      (item) => typeof item !== 'string' || !RESOURCE_ID_PATTERN.test(item),
    )
  ) {
    throw new ApiRequestError(
      400,
      'profile_invalid',
      `${fieldName} must contain at most 100 valid identifiers.`,
    )
  }

  return [...new Set(value)] as string[]
}

function parseUpdateCurrentMembershipInput(
  value: unknown,
): UpdateCurrentMembershipInput {
  if (!isRecord(value)) {
    throw new ApiRequestError(
      400,
      'invalid_request',
      'The request body must be a JSON object.',
    )
  }

  const knownFields = new Set([
    'communityId',
    'displayName',
    'favoriteGameIds',
    'tagIds',
  ])
  const unknownField = Object.keys(value).find(
    (field) => !knownFields.has(field),
  )

  if (unknownField) {
    throw new ApiRequestError(
      400,
      'invalid_request',
      `Unknown request field: ${unknownField}.`,
    )
  }

  if (
    typeof value.communityId !== 'string' ||
    !RESOURCE_ID_PATTERN.test(value.communityId)
  ) {
    throw new ApiRequestError(
      400,
      'profile_invalid',
      'communityId must be a valid identifier.',
    )
  }

  if (typeof value.displayName !== 'string') {
    throw new ApiRequestError(
      400,
      'profile_invalid',
      'displayName must be a string.',
    )
  }

  const displayName = value.displayName.trim()

  if (
    displayName.length === 0 ||
    displayName.length > MAX_DISPLAY_NAME_LENGTH
  ) {
    throw new ApiRequestError(
      400,
      'profile_invalid',
      `displayName must contain between 1 and ${MAX_DISPLAY_NAME_LENGTH} characters.`,
    )
  }

  return {
    communityId: value.communityId,
    displayName,
    favoriteGameIds: parseResourceIds(value.favoriteGameIds, 'favoriteGameIds'),
    tagIds: parseResourceIds(value.tagIds, 'tagIds'),
  }
}

function parseStringArray(value: string) {
  const parsed: unknown = JSON.parse(value)

  if (
    !Array.isArray(parsed) ||
    !parsed.every((item): item is string => typeof item === 'string')
  ) {
    throw new Error('Community membership preferences are not valid.')
  }

  return parsed
}

export async function handleCurrentUserRequest({
  context,
  env,
  request,
}: CurrentUserRequestContext) {
  if (request.method !== 'GET' && request.method !== 'PATCH') {
    return apiError(
      405,
      'method_not_allowed',
      'This endpoint only accepts GET or PATCH requests.',
      { Allow: 'GET, PATCH' },
    )
  }

  const user = await getAuthenticatedUser({ context, env, request })

  if (!user) {
    return apiError(
      401,
      'authentication_required',
      'Authentication is required.',
    )
  }

  if (request.method === 'PATCH') {
    try {
      const input = parseUpdateCurrentMembershipInput(
        await readJsonBody(request, 4096),
      )
      const updatedAt = new Date().toISOString()
      const updatedMembership = await env.DB.prepare(
        `update community_member
        set display_name = ?,
            favorite_game_ids = ?,
            tag_ids = ?,
            updated_at = ?
        where community_id = ?
          and user_id = ?
          and status = 'approved'
        returning
          id,
          community_id,
          display_name,
          favorite_game_ids,
          tag_ids`,
      )
        .bind(
          input.displayName,
          JSON.stringify(input.favoriteGameIds),
          JSON.stringify(input.tagIds),
          updatedAt,
          input.communityId,
          user.id,
        )
        .first<UpdatedMembershipRow>()

      if (!updatedMembership) {
        return apiError(
          403,
          'membership_access_required',
          'An approved community membership is required.',
        )
      }

      return jsonResponse({
        membership: {
          communityId: updatedMembership.community_id,
          displayName: updatedMembership.display_name,
          favoriteGameIds: parseStringArray(
            updatedMembership.favorite_game_ids,
          ),
          id: updatedMembership.id,
          tagIds: parseStringArray(updatedMembership.tag_ids),
        },
      })
    } catch (error) {
      if (error instanceof ApiRequestError) {
        return apiError(error.status, error.code, error.message)
      }

      throw error
    }
  }

  const { results } = await env.DB.prepare(
    `select
      cm.id,
      cm.community_id,
      cm.display_name,
      cm.role,
      cm.status,
      cm.favorite_game_ids,
      cm.tag_ids,
      cm.joined_at,
      c.name as community_name,
      c.slug as community_slug,
      c.city
    from community_member cm
    inner join community c on c.id = cm.community_id
    where cm.user_id = ?
    order by cm.joined_at asc, cm.id asc`,
  )
    .bind(user.id)
    .all<CurrentMembershipRow>()

  return jsonResponse({
    memberships: results.map((membership) => ({
      community: {
        city: membership.city,
        id: membership.community_id,
        name: membership.community_name,
        slug: membership.community_slug,
      },
      displayName: membership.display_name,
      favoriteGameIds: parseStringArray(membership.favorite_game_ids),
      id: membership.id,
      joinedAt: membership.joined_at,
      role: membership.role,
      status: membership.status,
      tagIds: parseStringArray(membership.tag_ids),
    })),
    user,
  })
}
