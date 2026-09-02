import { describe, expect, it } from 'vitest'

import { ClientApiError } from './client'
import { describeOtpError } from './otpErrorPresentation'

describe('describeOtpError', () => {
  it('distinguishes invalid and expired verification codes', () => {
    expect(
      describeOtpError(
        new ClientApiError(400, 'INVALID_OTP', 'Invalid code'),
        'verify',
      ),
    ).toMatchObject({ kind: 'invalid' })
    expect(
      describeOtpError(
        new ClientApiError(400, 'OTP_EXPIRED', 'Expired code'),
        'verify',
      ),
    ).toMatchObject({ kind: 'expired' })
  })

  it('recognizes rate limits from either the status or the API code', () => {
    expect(
      describeOtpError(
        new ClientApiError(429, 'request_failed', 'Too many requests'),
        'request',
      ),
    ).toMatchObject({ kind: 'rate_limited' })
    expect(
      describeOtpError(
        new ClientApiError(400, 'TOO_MANY_ATTEMPTS', 'Too many attempts'),
        'verify',
      ),
    ).toMatchObject({ kind: 'rate_limited' })
  })

  it('presents network failures consistently for both operations', () => {
    const error = new ClientApiError(0, 'network_error', 'Offline')

    expect(describeOtpError(error, 'request')).toEqual({
      kind: 'network',
      message:
        'No hemos podido conectar con el servidor. Comprueba tu conexión a internet.',
    })
    expect(describeOtpError(error, 'verify')).toMatchObject({ kind: 'network' })
  })

  it('keeps unexpected failures generic and operation-specific', () => {
    expect(describeOtpError(new Error('Unexpected'), 'request')).toEqual({
      kind: 'unknown',
      message:
        'No se ha podido enviar el código. Comprueba el correo e inténtalo de nuevo.',
    })
    expect(describeOtpError(new Error('Unexpected'), 'verify')).toEqual({
      kind: 'unknown',
      message: 'No se ha podido verificar el código. Inténtalo de nuevo.',
    })
  })
})
