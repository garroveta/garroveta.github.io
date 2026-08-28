const LOCAL_APP_ORIGIN = 'http://localhost:5173'
const API_ALLOWED_METHODS = ['DELETE', 'GET', 'PATCH', 'POST'] as const

interface CorsEnv {
  APP_ORIGIN: string
}

interface ApiErrorBody {
  error: {
    code: string
    message: string
  }
}

export class ApiRequestError extends Error {
  readonly code: string
  readonly status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.code = code
    this.status = status
  }
}

export function getAllowedOrigin(request: Request, env: CorsEnv) {
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

export function addCorsHeaders(response: Response, allowedOrigin: string) {
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

export function createPreflightResponse(allowedOrigin: string) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': API_ALLOWED_METHODS.join(', '),
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    },
    status: 204,
  })
}

export function jsonResponse<T>(body: T, init: ResponseInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('Cache-Control', 'no-store')
  headers.set('Content-Type', 'application/json; charset=utf-8')

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  })
}

export function apiError(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
) {
  return jsonResponse<ApiErrorBody>(
    {
      error: {
        code,
        message,
      },
    },
    { headers, status },
  )
}

export async function readJsonBody(
  request: Request,
  maxBytes = 4096,
): Promise<unknown> {
  const contentType = request.headers.get('Content-Type') ?? ''

  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new ApiRequestError(
      415,
      'unsupported_media_type',
      'Content-Type must be application/json.',
    )
  }

  const declaredLength = Number(request.headers.get('Content-Length'))

  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new ApiRequestError(
      413,
      'request_body_too_large',
      `The request body must not exceed ${maxBytes} bytes.`,
    )
  }

  if (!request.body) {
    throw new ApiRequestError(
      400,
      'invalid_json',
      'A JSON request body is required.',
    )
  }

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    totalBytes += value.byteLength

    if (totalBytes > maxBytes) {
      await reader.cancel()
      throw new ApiRequestError(
        413,
        'request_body_too_large',
        `The request body must not exceed ${maxBytes} bytes.`,
      )
    }

    chunks.push(value)
  }

  const bodyBytes = new Uint8Array(totalBytes)
  let offset = 0

  for (const chunk of chunks) {
    bodyBytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    const bodyText = new TextDecoder('utf-8', { fatal: true }).decode(bodyBytes)
    return JSON.parse(bodyText) as unknown
  } catch {
    throw new ApiRequestError(
      400,
      'invalid_json',
      'The request body must contain valid JSON.',
    )
  }
}
