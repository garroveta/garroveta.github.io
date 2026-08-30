import { type AuthEnv } from './auth'
import { getAuthenticatedUser } from './authorization'
import { apiError, jsonResponse } from './http'

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
  if (request.method !== 'GET') {
    return apiError(
      405,
      'method_not_allowed',
      'This endpoint only accepts GET requests.',
      { Allow: 'GET' },
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
