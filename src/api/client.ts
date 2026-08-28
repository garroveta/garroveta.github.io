const DEFAULT_PRODUCTION_API_ORIGIN = 'https://api.garroveta.es'

function getApiOrigin() {
  const configuredOrigin = import.meta.env.VITE_API_ORIGIN?.trim()

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, '')
  }

  return import.meta.env.PROD
    ? DEFAULT_PRODUCTION_API_ORIGIN
    : window.location.origin
}

export const apiOrigin = getApiOrigin()

export function getApiUrl(pathname: string) {
  return new URL(pathname, `${apiOrigin}/`).toString()
}

export class ClientApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ClientApiError'
    this.code = code
    this.status = status
  }
}

function isApiErrorBody(
  value: unknown,
): value is { error: { code: string; message: string } } {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return false
  }

  const error = value.error
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  )
}

export async function apiRequest<T>(
  pathname: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)

  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(getApiUrl(pathname), {
    ...init,
    credentials: 'include',
    headers,
  })
  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    if (isApiErrorBody(body)) {
      throw new ClientApiError(
        response.status,
        body.error.code,
        body.error.message,
      )
    }

    throw new ClientApiError(
      response.status,
      'request_failed',
      'No se ha podido completar la solicitud.',
    )
  }

  return body as T
}
