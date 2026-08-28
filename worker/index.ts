import { handleApiRequest } from './api'
import { type AuthEnv, createAuth } from './auth'
import {
  addCorsHeaders,
  apiError,
  createPreflightResponse,
  getAllowedOrigin,
} from './http'

function isAuthRequest(pathname: string) {
  return pathname === '/api/auth' || pathname.startsWith('/api/auth/')
}

export default {
  async fetch(request, env, context) {
    const requestUrl = new URL(request.url)

    if (
      requestUrl.pathname === '/api' ||
      requestUrl.pathname.startsWith('/api/')
    ) {
      const allowedOrigin = getAllowedOrigin(request, env)
      const requestOrigin = request.headers.get('Origin')

      if (request.method === 'OPTIONS') {
        return allowedOrigin
          ? createPreflightResponse(allowedOrigin)
          : new Response(null, { status: 403 })
      }

      if (requestOrigin && !allowedOrigin) {
        return apiError(
          403,
          'origin_not_allowed',
          'This origin is not allowed.',
        )
      }

      let response: Response

      try {
        response = isAuthRequest(requestUrl.pathname)
          ? await createAuth({ context, env, request }).handler(request)
          : await handleApiRequest({ context, env, request })
      } catch (error) {
        console.error('Unhandled API request error', error)
        response = apiError(
          500,
          'internal_error',
          'An unexpected server error occurred.',
        )
      }

      return allowedOrigin ? addCorsHeaders(response, allowedOrigin) : response
    }

    return new Response('Not found', { status: 404 })
  },
} satisfies ExportedHandler<AuthEnv>
