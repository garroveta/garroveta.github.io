import { type AuthEnv } from './auth'
import { apiError, jsonResponse } from './http'
import { handleInvitationApiRequest, matchInvitationRoute } from './invitations'

export interface ApiRequestContext {
  context: ExecutionContext
  env: AuthEnv
  request: Request
}

export function handleApiRequest({
  context,
  env,
  request,
}: ApiRequestContext): Response | Promise<Response> {
  const requestUrl = new URL(request.url)

  if (requestUrl.pathname === '/api/health') {
    if (request.method !== 'GET') {
      return apiError(
        405,
        'method_not_allowed',
        'This endpoint only accepts GET requests.',
        { Allow: 'GET' },
      )
    }

    return jsonResponse({
      status: 'ok',
    })
  }

  const invitationRoute = matchInvitationRoute(requestUrl.pathname)

  if (invitationRoute) {
    return handleInvitationApiRequest(
      {
        context,
        env,
        request,
      },
      invitationRoute,
    )
  }

  return apiError(404, 'not_found', 'The requested API endpoint was not found.')
}
