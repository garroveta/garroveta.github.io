import { type AuthEnv, createAuth } from './auth'

const LOCAL_APP_ORIGIN = 'http://localhost:5173'

function getAllowedOrigin(request: Request, env: AuthEnv) {
  const requestOrigin = request.headers.get('Origin')
  const allowedOrigins = new Set([
    env.APP_ORIGIN,
    'https://www.garroveta.es',
    LOCAL_APP_ORIGIN,
  ])

  return requestOrigin && allowedOrigins.has(requestOrigin)
    ? requestOrigin
    : null
}

function addCorsHeaders(response: Response, allowedOrigin: string) {
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Credentials', 'true')
  headers.set('Access-Control-Allow-Origin', allowedOrigin)
  headers.append('Vary', 'Origin')

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  })
}

function createPreflightResponse(allowedOrigin: string) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    },
    status: 204,
  })
}

export default {
  async fetch(request, env, context) {
    const requestUrl = new URL(request.url)

    if (requestUrl.pathname.startsWith('/api/auth')) {
      const allowedOrigin = getAllowedOrigin(request, env)

      if (request.method === 'OPTIONS') {
        return allowedOrigin
          ? createPreflightResponse(allowedOrigin)
          : new Response(null, { status: 403 })
      }

      const response = await createAuth({ context, env, request }).handler(
        request,
      )
      return allowedOrigin ? addCorsHeaders(response, allowedOrigin) : response
    }

    return new Response('Not found', { status: 404 })
  },
} satisfies ExportedHandler<AuthEnv>
