import { useEffect, useState } from 'react'

import { ClientApiError } from '../api/client'
import { sendSignInOtp, verifySignInOtp } from '../api/registration'

const OTP_EXPIRATION_SECONDS = 10 * 60
const OTP_MAX_ATTEMPTS = 3
const OTP_RESEND_DELAY_SECONDS = 30

export function formatOtpCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function useEmailOtp() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpAttempts, setOtpAttempts] = useState(0)
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [otpError, setOtpError] = useState('')
  const [requestError, setRequestError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (otpSentAt === null) {
      return
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [otpSentAt])

  const elapsedSeconds = otpSentAt ? Math.floor((now - otpSentAt) / 1000) : 0
  const expirationRemaining = Math.max(
    0,
    OTP_EXPIRATION_SECONDS - elapsedSeconds,
  )
  const resendRemaining = Math.max(0, OTP_RESEND_DELAY_SECONDS - elapsedSeconds)
  const attemptsRemaining = Math.max(0, OTP_MAX_ATTEMPTS - otpAttempts)
  const isOtpExpired = expirationRemaining === 0
  const isOtpLocked = attemptsRemaining === 0

  const requestCode = async () => {
    setIsSubmitting(true)
    setRequestError('')

    try {
      await sendSignInOtp(email.trim())
    } catch (error) {
      setRequestError(
        error instanceof ClientApiError && error.status === 429
          ? 'Se han solicitado demasiados códigos. Inténtalo de nuevo más tarde.'
          : 'No se ha podido enviar el código. Comprueba el correo e inténtalo de nuevo.',
      )
      setIsSubmitting(false)
      return false
    }

    const sentAt = Date.now()
    setOtp('')
    setOtpAttempts(0)
    setOtpError('')
    setOtpSentAt(sentAt)
    setNow(sentAt)
    setIsSubmitting(false)
    return true
  }

  const verifyCode = async () => {
    if (isOtpExpired) {
      setOtpError('El código ha caducado. Solicita uno nuevo.')
      return false
    }

    if (isOtpLocked) {
      setOtpError('Has agotado los tres intentos. Solicita un código nuevo.')
      return false
    }

    setIsSubmitting(true)
    setOtpError('')

    try {
      await verifySignInOtp(email.trim(), otp)
      return true
    } catch (error) {
      const code = error instanceof ClientApiError ? error.code : ''

      if (code === 'TOO_MANY_ATTEMPTS') {
        setOtpAttempts(OTP_MAX_ATTEMPTS)
        setOtpError('Has agotado los tres intentos. Solicita un código nuevo.')
      } else if (code === 'OTP_EXPIRED') {
        setOtpSentAt(Date.now() - OTP_EXPIRATION_SECONDS * 1000)
        setOtpError('El código ha caducado. Solicita uno nuevo.')
      } else if (code === 'INVALID_OTP') {
        const nextAttempts = Math.min(OTP_MAX_ATTEMPTS, otpAttempts + 1)
        setOtpAttempts(nextAttempts)
        setOtpError(
          nextAttempts >= OTP_MAX_ATTEMPTS
            ? 'Has agotado los tres intentos. Solicita un código nuevo.'
            : `Código incorrecto. Te quedan ${OTP_MAX_ATTEMPTS - nextAttempts} intentos.`,
        )
      } else {
        setOtpError('No se ha podido verificar el código. Inténtalo de nuevo.')
      }

      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const changeEmail = () => {
    setOtp('')
    setOtpError('')
    setRequestError('')
    setOtpSentAt(null)
  }

  return {
    attemptsRemaining,
    changeEmail,
    email,
    expirationRemaining,
    isOtpExpired,
    isOtpLocked,
    isSubmitting,
    otp,
    otpError,
    requestCode,
    requestError,
    resendRemaining,
    setEmail,
    setOtp,
    verifyCode,
  }
}

export type EmailOtpFlow = ReturnType<typeof useEmailOtp>
