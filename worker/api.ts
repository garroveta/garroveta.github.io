import { type AuthEnv } from './auth'
import { apiError, jsonResponse } from './http'
import { handleCurrentUserRequest } from './current-user'
import { handleInvitationApiRequest, matchInvitationRoute } from './invitations'
import { handleMemberApiRequest, matchMemberRoute } from './members'
import { handleEventApiRequest, matchEventRoute } from './events'
import {
  handleEventRegistrationApiRequest,
  matchEventRegistrationRoute,
} from './event-registrations'
import {
  handleCommunicationApiRequest,
  matchCommunicationRoute,
} from './communications'

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

  if (requestUrl.pathname === '/api/me') {
    return handleCurrentUserRequest({ context, env, request })
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

  const memberRoute = matchMemberRoute(requestUrl.pathname)

  if (memberRoute) {
    return handleMemberApiRequest(
      {
        context,
        env,
        request,
      },
      memberRoute,
    )
  }

  const communicationRoute = matchCommunicationRoute(requestUrl.pathname)

  if (communicationRoute) {
    return handleCommunicationApiRequest(
      {
        context,
        env,
        request,
      },
      communicationRoute,
    )
  }

  const eventRegistrationRoute = matchEventRegistrationRoute(
    requestUrl.pathname,
  )

  if (eventRegistrationRoute) {
    return handleEventRegistrationApiRequest(
      {
        context,
        env,
        request,
      },
      eventRegistrationRoute,
    )
  }

  const eventRoute = matchEventRoute(requestUrl.pathname)

  if (eventRoute) {
    return handleEventApiRequest(
      {
        context,
        env,
        request,
      },
      eventRoute,
    )
  }

  return apiError(404, 'not_found', 'The requested API endpoint was not found.')
}
