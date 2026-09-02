import { useEffect, useState } from 'react'

import { sendSignInOtp, verifySignInOtp } from '../api/registration'
import { describeOtpError } from '../api/otpErrorPresentation'

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
      setRequestError(describeOtpError(error, 'request').message)
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
      const presentation = describeOtpError(error, 'verify')

      if (presentation.kind === 'rate_limited') {
        setOtpAttempts(OTP_MAX_ATTEMPTS)
        setOtpError(presentation.message)
      } else if (presentation.kind === 'expired') {
        setOtpSentAt(Date.now() - OTP_EXPIRATION_SECONDS * 1000)
        setOtpError(presentation.message)
      } else if (presentation.kind === 'invalid') {
        const nextAttempts = Math.min(OTP_MAX_ATTEMPTS, otpAttempts + 1)
        setOtpAttempts(nextAttempts)
        setOtpError(
          nextAttempts >= OTP_MAX_ATTEMPTS
            ? 'Has agotado los tres intentos. Solicita un código nuevo.'
            : `Código incorrecto. Te quedan ${OTP_MAX_ATTEMPTS - nextAttempts} intentos.`,
        )
      } else {
        setOtpError(presentation.message)
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
