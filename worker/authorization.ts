import { type AuthEnv, createAuth } from './auth'
import { apiError } from './http'

interface RequestContext {
  context: ExecutionContext
  env: AuthEnv
  request: Request
}

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
}

export interface ManagerMembership {
  id: string
  communityId: string
  userId: string
  displayName: string
  role: 'manager'
  status: 'approved'
}

export interface ManagerAuthorization {
  membership: ManagerMembership
  user: AuthenticatedUser
}

export type ManagerAuthorizationResult =
  | {
      authorized: true
      value: ManagerAuthorization
    }
  | {
      authorized: false
      response: Response
    }

interface ManagerMembershipRow {
  id: string
  community_id: string
  user_id: string
  display_name: string
  role: 'manager'
  status: 'approved'
}

export async function getAuthenticatedUser({
  context,
  env,
  request,
}: RequestContext): Promise<AuthenticatedUser | null> {
  const auth = createAuth({ context, env, request })
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  }
}

export async function getApprovedManagerMembership(
  db: D1Database,
  communityId: string,
  userId: string,
): Promise<ManagerMembership | null> {
  const membership = await db
    .prepare(
      `select
        id,
        community_id,
        user_id,
        display_name,
        role,
        status
      from community_member
      where community_id = ?
        and user_id = ?
        and role = 'manager'
        and status = 'approved'
      limit 1`,
    )
    .bind(communityId, userId)
    .first<ManagerMembershipRow>()

  if (!membership) {
    return null
  }

  return {
    id: membership.id,
    communityId: membership.community_id,
    userId: membership.user_id,
    displayName: membership.display_name,
    role: membership.role,
    status: membership.status,
  }
}

export async function authorizeApprovedManager(
  requestContext: RequestContext,
  communityId: string,
): Promise<ManagerAuthorizationResult> {
  const user = await getAuthenticatedUser(requestContext)

  if (!user) {
    return {
      authorized: false,
      response: apiError(
        401,
        'authentication_required',
        'Authentication is required.',
      ),
    }
  }

  const membership = await getApprovedManagerMembership(
    requestContext.env.DB,
    communityId,
    user.id,
  )

  if (!membership) {
    return {
      authorized: false,
      response: apiError(
        403,
        'manager_access_required',
        'Approved manager access is required.',
      ),
    }
  }

  return {
    authorized: true,
    value: {
      membership,
      user,
    },
  }
}
