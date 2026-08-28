import { type AuthEnv } from './auth'
import {
  type ManagerAuthorization,
  authorizeApprovedManager,
  getAuthenticatedUser,
} from './authorization'
import { ApiRequestError, apiError, jsonResponse, readJsonBody } from './http'

const DEFAULT_EXPIRATION_DAYS = 30
const MAX_EXPIRATION_DAYS = 90
const MAX_LABEL_LENGTH = 120
const MAX_DISPLAY_NAME_LENGTH = 80
const RESOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/
const INVITATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export type InvitationStatus = 'active' | 'expired' | 'revoked' | 'used'

interface InvitationRequestContext {
  context: ExecutionContext
  env: AuthEnv
  request: Request
}

interface InvitationRoute {
  communityId?: string
  invitationId?: string
  kind: 'collection' | 'redeem' | 'revoke' | 'validate'
}

interface CreateInvitationInput {
  expiresInDays: number
  label: string | null
}

interface RedeemInvitationInput {
  displayName: string
  favoriteGameIds: string[]
  invite: string
  tagIds: string[]
}

interface InvitationRow {
  community_id: string
  created_at: string
  created_by_member_id: string
  expires_at: string
  id: string
  label: string | null
  revoked_at: string | null
  status: InvitationStatus
  used_at: string | null
}

interface InvitationStateRow {
  city?: string
  community_id?: string
  community_name?: string
  expires_at: string
  id?: string
  revoked_at: string | null
  used_at: string | null
  used_by_user_id?: string | null
}

interface CommunityMembershipRow {
  display_name: string
  id: string
  role: 'manager' | 'moderator' | 'player'
  status: 'approved' | 'pending' | 'suspended'
}

interface InvitationToken {
  hash: string
  token: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseCreateInvitationInput(value: unknown): CreateInvitationInput {
  if (!isRecord(value)) {
    throw new ApiRequestError(
      400,
      'invalid_request',
      'The request body must be a JSON object.',
    )
  }

  const unknownField = Object.keys(value).find(
    (field) => field !== 'expiresInDays' && field !== 'label',
  )

  if (unknownField) {
    throw new ApiRequestError(
      400,
      'invalid_request',
      `Unknown request field: ${unknownField}.`,
    )
  }

  const expiresInDays = value.expiresInDays ?? DEFAULT_EXPIRATION_DAYS

  if (
    typeof expiresInDays !== 'number' ||
    !Number.isInteger(expiresInDays) ||
    expiresInDays < 1 ||
    expiresInDays > MAX_EXPIRATION_DAYS
  ) {
    throw new ApiRequestError(
      400,
      'invalid_expiration',
      `expiresInDays must be an integer between 1 and ${MAX_EXPIRATION_DAYS}.`,
    )
  }

  if (value.label === undefined || value.label === null) {
    return { expiresInDays, label: null }
  }

  if (typeof value.label !== 'string') {
    throw new ApiRequestError(400, 'invalid_label', 'label must be a string.')
  }

  const label = value.label.trim()

  if (label.length === 0 || label.length > MAX_LABEL_LENGTH) {
    throw new ApiRequestError(
      400,
      'invalid_label',
      `label must contain between 1 and ${MAX_LABEL_LENGTH} characters.`,
    )
  }

  return { expiresInDays, label }
}

function parseStringArray(value: unknown, fieldName: string): string[] {
  if (value === undefined) {
    return []
  }

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

  return [...new Set(value)]
}

function parseRedeemInvitationInput(value: unknown): RedeemInvitationInput {
  if (!isRecord(value)) {
    throw new ApiRequestError(
      400,
      'invalid_request',
      'The request body must be a JSON object.',
    )
  }

  const unknownField = Object.keys(value).find(
    (field) =>
      field !== 'displayName' &&
      field !== 'favoriteGameIds' &&
      field !== 'invite' &&
      field !== 'tagIds',
  )

  if (unknownField) {
    throw new ApiRequestError(
      400,
      'invalid_request',
      `Unknown request field: ${unknownField}.`,
    )
  }

  if (
    typeof value.invite !== 'string' ||
    !INVITATION_TOKEN_PATTERN.test(value.invite)
  ) {
    throw new ApiRequestError(
      400,
      'invalid',
      'The invitation link is not valid.',
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
    displayName,
    favoriteGameIds: parseStringArray(value.favoriteGameIds, 'favoriteGameIds'),
    invite: value.invite,
    tagIds: parseStringArray(value.tagIds, 'tagIds'),
  }
}

function getInvitationStatus(
  state: InvitationStateRow,
  now: string,
): InvitationStatus {
  if (state.used_at) {
    return 'used'
  }

  if (state.revoked_at) {
    return 'revoked'
  }

  if (state.expires_at <= now) {
    return 'expired'
  }

  return 'active'
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

export async function hashInvitationToken(token: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  )

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

export async function createInvitationToken(): Promise<InvitationToken> {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
  const token = encodeBase64Url(tokenBytes)

  return {
    hash: await hashInvitationToken(token),
    token,
  }
}

export function matchInvitationRoute(pathname: string): InvitationRoute | null {
  if (
    pathname === '/api/invitations/validate' ||
    pathname === '/api/invitations/validate/'
  ) {
    return { kind: 'validate' }
  }

  if (
    pathname === '/api/invitations/redeem' ||
    pathname === '/api/invitations/redeem/'
  ) {
    return { kind: 'redeem' }
  }

  const collectionMatch = pathname.match(
    /^\/api\/communities\/([^/]+)\/invitations\/?$/,
  )

  if (collectionMatch && RESOURCE_ID_PATTERN.test(collectionMatch[1] ?? '')) {
    return {
      communityId: collectionMatch[1]!,
      kind: 'collection',
    }
  }

  const revokeMatch = pathname.match(
    /^\/api\/communities\/([^/]+)\/invitations\/([^/]+)\/revoke\/?$/,
  )

  if (
    revokeMatch &&
    RESOURCE_ID_PATTERN.test(revokeMatch[1] ?? '') &&
    RESOURCE_ID_PATTERN.test(revokeMatch[2] ?? '')
  ) {
    return {
      communityId: revokeMatch[1]!,
      invitationId: revokeMatch[2]!,
      kind: 'revoke',
    }
  }

  return null
}

function getInvitationUrl(appOrigin: string, token: string) {
  const invitationUrl = new URL(appOrigin)
  invitationUrl.hash = `registro?invite=${encodeURIComponent(token)}`
  return invitationUrl.toString()
}

function toInvitation(row: InvitationRow) {
  return {
    communityId: row.community_id,
    createdAt: row.created_at,
    createdByMemberId: row.created_by_member_id,
    expiresAt: row.expires_at,
    id: row.id,
    label: row.label,
    revokedAt: row.revoked_at,
    status: row.status,
    usedAt: row.used_at,
  }
}

function toMembership(row: CommunityMembershipRow, communityId: string) {
  return {
    communityId,
    displayName: row.display_name,
    id: row.id,
    role: row.role,
    status: row.status,
  }
}

async function getInvitationByTokenHash(db: D1Database, tokenHash: string) {
  return db
    .prepare(
      `select
        ci.id,
        ci.community_id,
        ci.expires_at,
        ci.revoked_at,
        ci.used_at,
        ci.used_by_user_id,
        c.name as community_name,
        c.city
      from community_invitation ci
      inner join community c on c.id = ci.community_id
      where ci.token_hash = ?
      limit 1`,
    )
    .bind(tokenHash)
    .first<InvitationStateRow>()
}

async function getCommunityMembership(
  db: D1Database,
  communityId: string,
  userId: string,
) {
  return db
    .prepare(
      `select id, display_name, role, status
      from community_member
      where community_id = ? and user_id = ?
      limit 1`,
    )
    .bind(communityId, userId)
    .first<CommunityMembershipRow>()
}

async function validateInvitation(requestContext: InvitationRequestContext) {
  const invite = new URL(requestContext.request.url).searchParams.get('invite')

  if (!invite || !INVITATION_TOKEN_PATTERN.test(invite)) {
    return jsonResponse({ status: 'invalid' as const })
  }

  const invitation = await getInvitationByTokenHash(
    requestContext.env.DB,
    await hashInvitationToken(invite),
  )

  if (!invitation) {
    return jsonResponse({ status: 'invalid' as const })
  }

  return jsonResponse({
    community: {
      city: invitation.city,
      name: invitation.community_name,
    },
    expiresAt: invitation.expires_at,
    status: getInvitationStatus(invitation, new Date().toISOString()),
  })
}

function getRedemptionError(
  invitation: InvitationStateRow | null,
  membership: CommunityMembershipRow | null,
  userId: string,
  now: string,
) {
  if (!invitation?.community_id || !invitation.id) {
    return apiError(400, 'invalid', 'The invitation link is not valid.')
  }

  if (invitation.used_at && invitation.used_by_user_id !== userId) {
    return apiError(409, 'used', 'This invitation has already been used.')
  }

  if (invitation.revoked_at) {
    return apiError(409, 'revoked', 'This invitation has been revoked.')
  }

  if (!invitation.used_at && invitation.expires_at <= now) {
    return apiError(409, 'expired', 'This invitation has expired.')
  }

  if (membership?.status === 'suspended') {
    return apiError(
      403,
      'membership_suspended',
      'Your membership is suspended. Contact the manager.',
    )
  }

  if (membership?.status === 'approved' && !invitation.used_at) {
    return apiError(
      409,
      'already_member',
      'You are already a member of this community.',
    )
  }

  return apiError(
    409,
    'membership_conflict',
    'The invitation could not be consumed.',
  )
}

async function redeemInvitation(requestContext: InvitationRequestContext) {
  const user = await getAuthenticatedUser(requestContext)

  if (!user) {
    return apiError(
      401,
      'authentication_required',
      'Authentication is required.',
    )
  }

  const input = parseRedeemInvitationInput(
    await readJsonBody(requestContext.request),
  )
  const now = new Date().toISOString()
  const tokenHash = await hashInvitationToken(input.invite)
  const memberId = crypto.randomUUID()
  const favoriteGameIds = JSON.stringify(input.favoriteGameIds)
  const tagIds = JSON.stringify(input.tagIds)

  const claimInvitation = requestContext.env.DB.prepare(
    `update community_invitation
    set used_at = coalesce(used_at, ?),
        used_by_user_id = coalesce(used_by_user_id, ?)
    where token_hash = ?
      and revoked_at is null
      and (
        used_by_user_id = ?
        or (
          used_at is null
          and expires_at > ?
          and not exists (
            select 1
            from community_member cm
            where cm.community_id = community_invitation.community_id
              and cm.user_id = ?
              and (
                cm.status in ('approved', 'suspended')
                or cm.role != 'player'
              )
          )
        )
      )`,
  ).bind(now, user.id, tokenHash, user.id, now, user.id)

  const createOrApproveMembership = requestContext.env.DB.prepare(
    `insert into community_member (
      id,
      community_id,
      user_id,
      display_name,
      role,
      status,
      favorite_game_ids,
      tag_ids,
      joined_at,
      created_at,
      updated_at
    )
    select
      ?,
      community_id,
      ?,
      ?,
      'player',
      'approved',
      ?,
      ?,
      ?,
      ?,
      ?
    from community_invitation
    where token_hash = ?
      and used_at is not null
      and used_by_user_id = ?
    on conflict (community_id, user_id) do update set
      display_name = excluded.display_name,
      status = 'approved',
      favorite_game_ids = excluded.favorite_game_ids,
      tag_ids = excluded.tag_ids,
      joined_at = excluded.joined_at,
      updated_at = excluded.updated_at
    where community_member.status = 'pending'
      and community_member.role = 'player'`,
  ).bind(
    memberId,
    user.id,
    input.displayName,
    favoriteGameIds,
    tagIds,
    now,
    now,
    now,
    tokenHash,
    user.id,
  )

  // D1 executes a batch as one transaction and rolls every statement back if
  // one fails. Both writes are conditional on the same invitation ownership.
  await requestContext.env.DB.batch([
    claimInvitation,
    createOrApproveMembership,
  ])

  const invitation = await getInvitationByTokenHash(
    requestContext.env.DB,
    tokenHash,
  )
  const membership = invitation?.community_id
    ? await getCommunityMembership(
        requestContext.env.DB,
        invitation.community_id,
        user.id,
      )
    : null

  if (
    invitation?.community_id &&
    invitation.used_by_user_id === user.id &&
    membership?.status === 'approved'
  ) {
    console.info(
      JSON.stringify({
        communityId: invitation.community_id,
        event: 'community_invitation.redeemed',
        invitationId: invitation.id,
        memberId: membership.id,
        userId: user.id,
      }),
    )

    return jsonResponse({
      membership: toMembership(membership, invitation.community_id),
      status: 'success' as const,
    })
  }

  return getRedemptionError(invitation, membership, user.id, now)
}

async function createInvitation(
  requestContext: InvitationRequestContext,
  manager: ManagerAuthorization,
  communityId: string,
) {
  const input = parseCreateInvitationInput(
    await readJsonBody(requestContext.request),
  )
  const createdAt = new Date()
  const expiresAt = new Date(
    createdAt.getTime() + input.expiresInDays * 24 * 60 * 60 * 1000,
  )
  const invitationId = crypto.randomUUID()
  const invitationToken = await createInvitationToken()

  await requestContext.env.DB.prepare(
    `insert into community_invitation (
      id,
      community_id,
      token_hash,
      created_by_member_id,
      label,
      expires_at,
      created_at
    ) values (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      invitationId,
      communityId,
      invitationToken.hash,
      manager.membership.id,
      input.label,
      expiresAt.toISOString(),
      createdAt.toISOString(),
    )
    .run()

  console.info(
    JSON.stringify({
      actorMemberId: manager.membership.id,
      communityId,
      event: 'community_invitation.created',
      invitationId,
    }),
  )

  return jsonResponse(
    {
      invitation: {
        communityId,
        createdAt: createdAt.toISOString(),
        createdByMemberId: manager.membership.id,
        expiresAt: expiresAt.toISOString(),
        id: invitationId,
        inviteUrl: getInvitationUrl(
          requestContext.env.APP_ORIGIN,
          invitationToken.token,
        ),
        label: input.label,
        revokedAt: null,
        status: 'active' as const,
        usedAt: null,
      },
    },
    { status: 201 },
  )
}

async function listInvitations(
  requestContext: InvitationRequestContext,
  communityId: string,
) {
  const now = new Date().toISOString()
  const { results } = await requestContext.env.DB.prepare(
    `select
      id,
      community_id,
      created_by_member_id,
      label,
      expires_at,
      revoked_at,
      used_at,
      created_at,
      case
        when used_at is not null then 'used'
        when revoked_at is not null then 'revoked'
        when expires_at <= ? then 'expired'
        else 'active'
      end as status
    from community_invitation
    where community_id = ?
    order by created_at desc
    limit 200`,
  )
    .bind(now, communityId)
    .all<InvitationRow>()

  return jsonResponse({
    invitations: results.map(toInvitation),
  })
}

function getTerminalStateError(state: InvitationStateRow, now: string) {
  if (state.used_at) {
    return apiError(409, 'invitation_used', 'This invitation has been used.')
  }

  if (state.revoked_at) {
    return apiError(
      409,
      'invitation_revoked',
      'This invitation has already been revoked.',
    )
  }

  if (state.expires_at <= now) {
    return apiError(409, 'invitation_expired', 'This invitation has expired.')
  }

  return apiError(
    409,
    'invitation_not_active',
    'This invitation is not active.',
  )
}

async function revokeInvitation(
  requestContext: InvitationRequestContext,
  manager: ManagerAuthorization,
  communityId: string,
  invitationId: string,
) {
  const revokedAt = new Date().toISOString()
  const revokedInvitation = await requestContext.env.DB.prepare(
    `update community_invitation
    set revoked_at = ?,
        revoked_by_member_id = ?
    where id = ?
      and community_id = ?
      and revoked_at is null
      and used_at is null
      and expires_at > ?
    returning
      id,
      community_id,
      created_by_member_id,
      label,
      expires_at,
      revoked_at,
      used_at,
      created_at,
      'revoked' as status`,
  )
    .bind(
      revokedAt,
      manager.membership.id,
      invitationId,
      communityId,
      revokedAt,
    )
    .first<InvitationRow>()

  if (!revokedInvitation) {
    const currentState = await requestContext.env.DB.prepare(
      `select expires_at, revoked_at, used_at
      from community_invitation
      where id = ? and community_id = ?
      limit 1`,
    )
      .bind(invitationId, communityId)
      .first<InvitationStateRow>()

    return currentState
      ? getTerminalStateError(currentState, revokedAt)
      : apiError(404, 'invitation_not_found', 'Invitation not found.')
  }

  console.info(
    JSON.stringify({
      actorMemberId: manager.membership.id,
      communityId,
      event: 'community_invitation.revoked',
      invitationId,
    }),
  )

  return jsonResponse({
    invitation: toInvitation(revokedInvitation),
  })
}

export async function handleInvitationApiRequest(
  requestContext: InvitationRequestContext,
  route: InvitationRoute,
) {
  try {
    if (route.kind === 'validate') {
      if (requestContext.request.method !== 'GET') {
        return apiError(
          405,
          'method_not_allowed',
          'This endpoint only accepts GET requests.',
          { Allow: 'GET' },
        )
      }

      return await validateInvitation(requestContext)
    }

    if (route.kind === 'redeem') {
      if (requestContext.request.method !== 'POST') {
        return apiError(
          405,
          'method_not_allowed',
          'This endpoint only accepts POST requests.',
          { Allow: 'POST' },
        )
      }

      return await redeemInvitation(requestContext)
    }

    const allowedMethods =
      route.kind === 'collection' ? ['GET', 'POST'] : ['POST']

    if (!allowedMethods.includes(requestContext.request.method)) {
      return apiError(
        405,
        'method_not_allowed',
        `This endpoint only accepts ${allowedMethods.join(' or ')} requests.`,
        { Allow: allowedMethods.join(', ') },
      )
    }

    const authorization = await authorizeApprovedManager(
      requestContext,
      route.communityId!,
    )

    if (!authorization.authorized) {
      return authorization.response
    }

    if (route.kind === 'collection') {
      return requestContext.request.method === 'POST'
        ? await createInvitation(
            requestContext,
            authorization.value,
            route.communityId!,
          )
        : await listInvitations(requestContext, route.communityId!)
    }

    return await revokeInvitation(
      requestContext,
      authorization.value,
      route.communityId!,
      route.invitationId!,
    )
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return apiError(error.status, error.code, error.message)
    }

    throw error
  }
}
