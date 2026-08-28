import { describe, expect, it } from 'vitest'

import { handleApiRequest } from './api'
import { type AuthEnv } from './auth'

function handle(request: Request) {
  return handleApiRequest({
    context: {} as ExecutionContext,
    env: {} as AuthEnv,
    request,
  })
}

describe('Worker API router', () => {
  it('returns the health status', async () => {
    const response = await handle(
      new Request('https://api.garroveta.es/api/health'),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok' })
  })

  it('rejects unsupported methods with an Allow header', async () => {
    const response = await handle(
      new Request('https://api.garroveta.es/api/health', {
        method: 'POST',
      }),
    )

    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('GET')
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'method_not_allowed',
      },
    })
  })

  it('returns a JSON 404 for unknown endpoints', async () => {
    const response = await handle(
      new Request('https://api.garroveta.es/api/unknown'),
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'not_found',
      },
    })
  })
})
