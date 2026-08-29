import { authClient } from '../auth/client'
import { ClientApiError } from './client'

type AuthClientError = {
  code?: string
  error?: { code?: string; message?: string }
  message?: string
  status: number
  statusText?: string
}

function toAuthError(error: AuthClientError) {
  return new ClientApiError(
    error.status,
    error.code ?? error.error?.code ?? 'authentication_failed',
    error.message ??
      error.error?.message ??
      error.statusText ??
      'No se ha podido completar la autenticación.',
  )
}

export async function sendSignInOtp(email: string) {
  const { error } = await authClient.emailOtp.sendVerificationOtp({
    email,
    type: 'sign-in',
  })

  if (error) {
    throw toAuthError(error)
  }
}

export async function verifySignInOtp(email: string, otp: string) {
  const fallbackName = email.split('@')[0]?.trim() || 'Miembro'
  const { data, error } = await authClient.signIn.emailOtp({
    email,
    name: fallbackName,
    otp,
  })

  if (error) {
    throw toAuthError(error)
  }

  if (!data?.user) {
    throw new ClientApiError(
      401,
      'authentication_failed',
      'No se ha podido abrir la sesión.',
    )
  }

  return data
}
