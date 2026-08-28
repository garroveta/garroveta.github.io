import { describe, expect, it } from 'vitest'

import {
  addCorsHeaders,
  apiError,
  createPreflightResponse,
  getAllowedOrigin,
  jsonResponse,
  readJsonBody,
} from './http'

const env = {
  APP_ORIGIN: 'https://garroveta.es',
}

describe('Worker HTTP helpers', () => {
  it('allows production, www and local frontend origins', () => {
    for (const origin of [
      'https://garroveta.es',
      'https://www.garroveta.es',
      'http://localhost:5173',
    ]) {
      const request = new Request('https://api.garroveta.es/api/health', {
        headers: { Origin: origin },
      })

      expect(getAllowedOrigin(request, env)).toBe(origin)
    }
  })

  it('rejects unknown origins', () => {
    const request = new Request('https://api.garroveta.es/api/health', {
      headers: { Origin: 'https://example.com' },
    })

    expect(getAllowedOrigin(request, env)).toBeNull()
  })

  it('adds credentialed CORS headers without losing response metadata', () => {
    const response = addCorsHeaders(
      jsonResponse({ status: 'ok' }, { status: 201 }),
      env.APP_ORIGIN,
    )

    expect(response.status).toBe(201)
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe(
      'true',
    )
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      env.APP_ORIGIN,
    )
    expect(response.headers.get('Vary')).toContain('Origin')
  })

  it('advertises all supported API methods during preflight', () => {
    const response = createPreflightResponse(env.APP_ORIGIN)

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
      'DELETE, GET, PATCH, POST',
    )
  })

  it('returns non-cacheable JSON errors', async () => {
    const response = apiError(403, 'origin_not_allowed', 'Origin rejected.')

    expect(response.status).toBe(403)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Content-Type')).toBe(
      'application/json; charset=utf-8',
    )
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'origin_not_allowed',
        message: 'Origin rejected.',
      },
    })
  })

  it('reads bounded JSON request bodies', async () => {
    const request = new Request('https://api.garroveta.es/api/example', {
      body: JSON.stringify({ label: 'FNM' }),
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      method: 'POST',
    })

    await expect(readJsonBody(request)).resolves.toEqual({ label: 'FNM' })
  })

  it('rejects unsupported or oversized request bodies', async () => {
    const unsupported = new Request('https://api.garroveta.es/api/example', {
      body: 'label=FNM',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      method: 'POST',
    })
    const oversized = new Request('https://api.garroveta.es/api/example', {
      body: JSON.stringify({ label: 'FNM' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    await expect(readJsonBody(unsupported)).rejects.toMatchObject({
      code: 'unsupported_media_type',
      status: 415,
    })
    await expect(readJsonBody(oversized, 4)).rejects.toMatchObject({
      code: 'request_body_too_large',
      status: 413,
    })
  })
})
