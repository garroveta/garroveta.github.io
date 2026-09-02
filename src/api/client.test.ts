import { afterEach, describe, expect, it, vi } from 'vitest'

import { apiRequest, ClientApiError } from './client'

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('wraps a fetch rejection as a network ClientApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    await expect(apiRequest('/api/me')).rejects.toMatchObject({
      code: 'network_error',
      status: 0,
    })
  })

  it('rethrows an aborted request instead of treating it as a network error', async () => {
    const abortError = new DOMException('Aborted', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError))

    await expect(apiRequest('/api/me')).rejects.toBe(abortError)
  })

  it('throws the server error code and message on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: 'not_found', message: 'No encontrado.' },
          }),
          { status: 404 },
        ),
      ),
    )

    await expect(apiRequest('/api/me')).rejects.toMatchObject({
      code: 'not_found',
      message: 'No encontrado.',
      status: 404,
    })
  })

  it('resolves with the parsed body on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        ),
    )

    await expect(apiRequest('/api/me')).resolves.toEqual({ ok: true })
  })
})

describe('ClientApiError', () => {
  it('exposes its status and code', () => {
    const error = new ClientApiError(500, 'internal_error', 'Boom')

    expect(error).toMatchObject({
      code: 'internal_error',
      message: 'Boom',
      status: 500,
    })
  })
})
