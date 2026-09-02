import { ClientApiError } from './client'
import { describeApiError } from './errorPresentation'

export type OtpErrorKind =
  'expired' | 'invalid' | 'network' | 'rate_limited' | 'unknown'

export type OtpOperation = 'request' | 'verify'

export type OtpErrorPresentation = {
  kind: OtpErrorKind
  message: string
}

const messages: Record<OtpOperation, Record<OtpErrorKind, string>> = {
  request: {
    expired: 'No se ha podido enviar el código. Inténtalo de nuevo.',
    invalid: 'No se ha podido enviar el código. Comprueba el correo.',
    network:
      'No hemos podido conectar con el servidor. Comprueba tu conexión a internet.',
    rate_limited:
      'Se han solicitado demasiados códigos. Inténtalo de nuevo más tarde.',
    unknown:
      'No se ha podido enviar el código. Comprueba el correo e inténtalo de nuevo.',
  },
  verify: {
    expired: 'El código ha caducado. Solicita uno nuevo.',
    invalid: 'El código no es válido. Comprueba las seis cifras.',
    network:
      'No hemos podido conectar con el servidor. Comprueba tu conexión a internet.',
    rate_limited:
      'Has realizado demasiados intentos. Solicita un código nuevo más tarde.',
    unknown: 'No se ha podido verificar el código. Inténtalo de nuevo.',
  },
}

function classifyOtpError(
  error: unknown,
  operation: OtpOperation,
): OtpErrorKind {
  if (error instanceof ClientApiError) {
    const code = error.code.toUpperCase()

    if (error.status === 429 || code === 'TOO_MANY_ATTEMPTS') {
      return 'rate_limited'
    }

    if (operation === 'verify') {
      if (code === 'OTP_EXPIRED') {
        return 'expired'
      }

      if (
        code === 'INVALID_OTP' ||
        code.includes('OTP') ||
        code.includes('VERIFICATION')
      ) {
        return 'invalid'
      }
    }
  }

  return describeApiError(error).kind === 'network' ? 'network' : 'unknown'
}

export function describeOtpError(
  error: unknown,
  operation: OtpOperation,
): OtpErrorPresentation {
  const kind = classifyOtpError(error, operation)

  return { kind, message: messages[operation][kind] }
}
