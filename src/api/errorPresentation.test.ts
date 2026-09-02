import { describe, expect, it } from 'vitest'

import { ClientApiError } from './client'
import { describeApiError } from './errorPresentation'

describe('describeApiError', () => {
  it('classifies a network failure', () => {
    const error = new ClientApiError(0, 'network_error', 'offline')

    expect(describeApiError(error)).toMatchObject({
      canRetry: true,
      kind: 'network',
    })
  })

  it('classifies an expired session', () => {
    const error = new ClientApiError(401, 'authentication_required', '')

    expect(describeApiError(error)).toMatchObject({
      canRetry: false,
      kind: 'session_expired',
    })
  })

  it('classifies an access denial', () => {
    const error = new ClientApiError(403, 'manager_access_required', '')

    expect(describeApiError(error)).toMatchObject({
      canRetry: false,
      kind: 'access_denied',
    })
  })

  it('classifies any other API error as unknown', () => {
    const error = new ClientApiError(500, 'internal_error', '')

    expect(describeApiError(error)).toMatchObject({
      canRetry: true,
      kind: 'unknown',
    })
  })

  it('classifies a non-API error as unknown', () => {
    expect(describeApiError(new Error('boom'))).toMatchObject({
      canRetry: true,
      kind: 'unknown',
    })
  })
})
