import { type AuthEnv } from './auth'
import { authorizeApprovedManager } from './authorization'
import { ApiRequestError, apiError, jsonResponse, readJsonBody } from './http'

const RESOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/
const COMMUNITY_ROLES = ['player', 'moderator', 'manager'] as const
const MUTABLE_MEMBER_STATUSES = ['approved', 'suspended'] as const

interface MemberRequestContext {
  context: ExecutionContext
  env: AuthEnv
  request: Request
}

interface MemberRoute {
  communityId: string
  kind: 'collection' | 'member'
  memberId?: string
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

interface UpdateMemberInput {
  role?: CommunityMemberRow['role']
  status?: 'approved' | 'suspended'
  tagIds?: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseResourceIds(value: unknown) {
  if (
    !Array.isArray(value) ||
    value.length > 100 ||
    value.some(
      (item) => typeof item !== 'string' || !RESOURCE_ID_PATTERN.test(item),
    )
  ) {
    throw new ApiRequestError(
      400,
      'member_invalid',
      'tagIds must contain at most 100 valid identifiers.',
    )
  }

  return [...new Set(value)] as string[]
}

function parseUpdateMemberInput(value: unknown): UpdateMemberInput {
  if (!isRecord(value)) {
    throw new ApiRequestError(
      400,
      'invalid_request',
      'The request body must be a JSON object.',
    )
  }

  const knownFields = new Set(['role', 'status', 'tagIds'])
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

  if (!Object.keys(value).length) {
    throw new ApiRequestError(
      400,
      'member_invalid',
      'At least one member field must be provided.',
    )
  }

  if (
    value.role !== undefined &&
    !COMMUNITY_ROLES.includes(value.role as (typeof COMMUNITY_ROLES)[number])
  ) {
    throw new ApiRequestError(
      400,
      'member_invalid',
      'role must be player, moderator or manager.',
    )
  }

  if (
    value.status !== undefined &&
    !MUTABLE_MEMBER_STATUSES.includes(
      value.status as (typeof MUTABLE_MEMBER_STATUSES)[number],
    )
  ) {
    throw new ApiRequestError(
      400,
      'member_invalid',
      'status must be approved or suspended.',
    )
  }

  return {
    role: value.role as UpdateMemberInput['role'],
    status: value.status as UpdateMemberInput['status'],
    tagIds:
      value.tagIds === undefined ? undefined : parseResourceIds(value.tagIds),
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

export function matchMemberRoute(pathname: string): MemberRoute | null {
  const collectionMatch = pathname.match(
    /^\/api\/communities\/([^/]+)\/members\/?$/,
  )
  const collectionCommunityId = collectionMatch?.[1]

  if (
    collectionCommunityId &&
    RESOURCE_ID_PATTERN.test(collectionCommunityId)
  ) {
    return { communityId: collectionCommunityId, kind: 'collection' }
  }

  const memberMatch = pathname.match(
    /^\/api\/communities\/([^/]+)\/members\/([^/]+)\/?$/,
  )
  const communityId = memberMatch?.[1]
  const memberId = memberMatch?.[2]

  if (
    !communityId ||
    !memberId ||
    !RESOURCE_ID_PATTERN.test(communityId) ||
    !RESOURCE_ID_PATTERN.test(memberId)
  ) {
    return null
  }

  return { communityId, kind: 'member', memberId }
}

function toMember(member: CommunityMemberRow) {
  return {
    displayName: member.display_name,
    email: member.email,
    favoriteGameIds: parseStringArray(member.favorite_game_ids),
    id: member.id,
    joinedAt: member.joined_at,
    role: member.role,
    status: member.status,
    tagIds: parseStringArray(member.tag_ids),
  }
}

async function listMembers(
  requestContext: MemberRequestContext,
  communityId: string,
  currentMemberId: string,
) {
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
    .bind(communityId)
    .all<CommunityMemberRow>()

  return jsonResponse({
    currentMemberId,
    members: results.map(toMember),
  })
}

async function updateMember(
  requestContext: MemberRequestContext,
  communityId: string,
  memberId: string,
  currentMemberId: string,
) {
  const input = parseUpdateMemberInput(
    await readJsonBody(requestContext.request),
  )
  const member = await requestContext.env.DB.prepare(
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
    where cm.community_id = ? and cm.id = ?
    limit 1`,
  )
    .bind(communityId, memberId)
    .first<CommunityMemberRow>()

  if (!member) {
    return apiError(404, 'member_not_found', 'Community member not found.')
  }

  if (
    member.id === currentMemberId &&
    ((input.role !== undefined && input.role !== 'manager') ||
      input.status === 'suspended')
  ) {
    return apiError(
      409,
      'current_manager_protected',
      'You cannot remove your own manager access.',
    )
  }

  const role = input.role ?? null
  const status = input.status ?? null
  const tagIds = input.tagIds ? JSON.stringify(input.tagIds) : null
  const updatedAt = new Date().toISOString()
  const updatedMember = await requestContext.env.DB.prepare(
    `update community_member
    set role = coalesce(?, role),
        status = coalesce(?, status),
        tag_ids = coalesce(?, tag_ids),
        updated_at = ?
    where community_id = ?
      and id = ?
      and not (
        role = 'manager'
        and status = 'approved'
        and (
          coalesce(?, role) != 'manager'
          or coalesce(?, status) != 'approved'
        )
        and 1 = (
          select count(*)
          from community_member
          where community_id = ?
            and role = 'manager'
            and status = 'approved'
        )
      )
    returning
      id,
      display_name,
      role,
      status,
      favorite_game_ids,
      tag_ids,
      joined_at`,
  )
    .bind(
      role,
      status,
      tagIds,
      updatedAt,
      communityId,
      memberId,
      role,
      status,
      communityId,
    )
    .first<Omit<CommunityMemberRow, 'email'>>()

  if (!updatedMember) {
    return apiError(
      409,
      'last_manager_protected',
      'The last approved manager cannot be demoted or suspended.',
    )
  }

  console.info(
    JSON.stringify({
      actorMemberId: currentMemberId,
      communityId,
      event: 'community_member.updated',
      memberId,
    }),
  )

  return jsonResponse({
    member: toMember({ ...updatedMember, email: member.email }),
  })
}

export async function handleMemberApiRequest(
  requestContext: MemberRequestContext,
  route: MemberRoute,
) {
  const expectedMethod = route.kind === 'collection' ? 'GET' : 'PATCH'

  if (requestContext.request.method !== expectedMethod) {
    return apiError(
      405,
      'method_not_allowed',
      `This endpoint only accepts ${expectedMethod} requests.`,
      { Allow: expectedMethod },
    )
  }

  const authorization = await authorizeApprovedManager(
    requestContext,
    route.communityId,
  )

  if (!authorization.authorized) {
    return authorization.response
  }

  try {
    return route.kind === 'collection'
      ? await listMembers(
          requestContext,
          route.communityId,
          authorization.value.membership.id,
        )
      : await updateMember(
          requestContext,
          route.communityId,
          route.memberId!,
          authorization.value.membership.id,
        )
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return apiError(error.status, error.code, error.message)
    }

    throw error
  }
}
