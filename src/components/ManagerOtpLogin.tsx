import { KeyRound, Mail } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import { sendSignInOtp, verifySignInOtp } from '../api/authentication'
import { ClientApiError } from '../api/client'

export type ManagerOtpLoginKind = 'access_denied' | 'session_expired'

export type ManagerOtpLoginProps = {
  kind: ManagerOtpLoginKind
  onAuthenticated: () => void
}

function getAuthenticationError(error: unknown) {
  if (error instanceof ClientApiError) {
    if (
      error.code.toLowerCase().includes('otp') ||
      error.code.toLowerCase().includes('verification')
    ) {
      return 'El código no es válido o ha caducado.'
    }

    if (error.status === 429) {
      return 'Has realizado demasiados intentos. Espera antes de continuar.'
    }
  }

  return 'No se ha podido completar el acceso. Vuelve a intentarlo.'
}

export function ManagerOtpLogin({
  kind,
  onAuthenticated,
}: ManagerOtpLoginProps) {
  const accessDenied = kind === 'access_denied'
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const sendCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      await sendSignInOtp(email.trim())
      setStep('otp')
    } catch (error) {
      setErrorMessage(getAuthenticationError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      await verifySignInOtp(email.trim(), otp)
      onAuthenticated()
    } catch (error) {
      setErrorMessage(getAuthenticationError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="manager-authentication-panel">
      <div className="manager-authentication-panel__heading">
        <KeyRound aria-hidden="true" size={20} />
        <div>
          <strong>
            {accessDenied
              ? 'Esta cuenta no tiene acceso de gerente'
              : 'Accede como gerente'}
          </strong>
          <p>
            {accessDenied
              ? 'Utiliza el correo de un gerente aprobado de la comunidad.'
              : 'Recibirás un código temporal por correo. No necesitas contraseña.'}
          </p>
        </div>
      </div>

      {step === 'email' ? (
        <form className="manager-authentication-form" onSubmit={sendCode}>
          <label className="form-field">
            Correo electrónico
            <span className="registration-input-with-icon">
              <Mail aria-hidden="true" size={18} />
              <input
                autoComplete="email"
                inputMode="email"
                name="manager-email"
                placeholder="gerente@email.com"
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </span>
          </label>
          <button
            className="primary-button"
            disabled={isSubmitting || !email.trim()}
            type="submit"
          >
            {isSubmitting ? 'Enviando…' : 'Recibir código'}
          </button>
        </form>
      ) : (
        <form className="manager-authentication-form" onSubmit={verifyCode}>
          <div className="manager-authentication-email">
            Código enviado a <strong>{email.trim()}</strong>
          </div>
          <label className="form-field">
            Código de seis cifras
            <span className="registration-input-with-icon">
              <KeyRound aria-hidden="true" size={18} />
              <input
                autoComplete="one-time-code"
                className="registration-code-input"
                inputMode="numeric"
                maxLength={6}
                name="manager-otp"
                pattern="[0-9]{6}"
                placeholder="000000"
                required
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                }
              />
            </span>
          </label>
          <div className="manager-authentication-actions">
            <button
              className="secondary-button"
              disabled={isSubmitting}
              type="button"
              onClick={() => {
                setOtp('')
                setErrorMessage('')
                setStep('email')
              }}
            >
              Cambiar correo
            </button>
            <button
              className="primary-button"
              disabled={isSubmitting || otp.length !== 6}
              type="submit"
            >
              {isSubmitting ? 'Verificando…' : 'Verificar código'}
            </button>
          </div>
        </form>
      )}

      {errorMessage ? (
        <p className="registration-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
