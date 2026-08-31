import { type AuthEnv } from './auth'
import { authorizeApprovedManager } from './authorization'
import { apiError, jsonResponse } from './http'

const RESOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/

interface MemberRequestContext {
  context: ExecutionContext
  env: AuthEnv
  request: Request
}

interface MemberRoute {
  communityId: string
}

interface CommunityMemberRow {
  display_name: string
  email: string
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

export function matchMemberRoute(pathname: string): MemberRoute | null {
  const match = pathname.match(/^\/api\/communities\/([^/]+)\/members\/?$/)
  const communityId = match?.[1]

  if (!communityId || !RESOURCE_ID_PATTERN.test(communityId)) {
    return null
  }

  return { communityId }
}

export async function handleMemberApiRequest(
  requestContext: MemberRequestContext,
  route: MemberRoute,
) {
  if (requestContext.request.method !== 'GET') {
    return apiError(
      405,
      'method_not_allowed',
      'This endpoint only accepts GET requests.',
      { Allow: 'GET' },
    )
  }

  const authorization = await authorizeApprovedManager(
    requestContext,
    route.communityId,
  )

  if (!authorization.authorized) {
    return authorization.response
  }

  const { results } = await requestContext.env.DB.prepare(
    `select
      cm.id,
      cm.display_name,
      cm.role,
      cm.status,
      cm.favorite_game_ids,
      cm.tag_ids,
      cm.joined_at,
      u.email
    from community_member cm
    inner join "user" u on u.id = cm.user_id
    where cm.community_id = ?
    order by
      case cm.status
        when 'pending' then 0
        when 'approved' then 1
        else 2
      end,
      cm.display_name collate nocase asc,
      cm.id asc
    limit 500`,
  )
    .bind(route.communityId)
    .all<CommunityMemberRow>()

  return jsonResponse({
    currentMemberId: authorization.value.membership.id,
    members: results.map((member) => ({
      displayName: member.display_name,
      email: member.email,
      favoriteGameIds: parseStringArray(member.favorite_game_ids),
      id: member.id,
      joinedAt: member.joined_at,
      role: member.role,
      status: member.status,
      tagIds: parseStringArray(member.tag_ids),
    })),
  })
}
