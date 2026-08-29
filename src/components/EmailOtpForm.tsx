import { ChevronRight, Clock3, KeyRound, Mail, RefreshCw } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'

import { formatOtpCountdown, type EmailOtpFlow } from '../hooks/useEmailOtp'

type EmailOtpFormProps = {
  accessDescription: string
  accessTitle: string
  approvalNote: ReactNode
  flow: EmailOtpFlow
  onStageChange: (stage: 'access' | 'verification') => void
  onVerified: (email: string) => void
  stage: 'access' | 'verification'
}

export function EmailOtpForm({
  accessDescription,
  accessTitle,
  approvalNote,
  flow,
  onStageChange,
  onVerified,
  stage,
}: EmailOtpFormProps) {
  const handleAccessSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (await flow.requestCode()) {
      onStageChange('verification')
    }
  }

  const handleOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (await flow.verifyCode()) {
      onVerified(flow.email.trim())
    }
  }

  if (stage === 'access') {
    return (
      <form
        aria-busy={flow.isSubmitting}
        className="registration-form"
        onSubmit={handleAccessSubmit}
      >
        <div className="registration-form__heading">
          <span>Primera etapa</span>
          <h2>{accessTitle}</h2>
          <p>{accessDescription}</p>
        </div>

        <label className="form-field">
          <span>Correo electrónico</span>
          <span className="registration-input-with-icon">
            <Mail aria-hidden="true" size={18} />
            <input
              required
              autoComplete="email"
              type="email"
              placeholder="tu@email.com"
              value={flow.email}
              onChange={(event) => flow.setEmail(event.target.value)}
            />
          </span>
        </label>

        <div className="registration-approval-note">
          <ShieldNoteIcon />
          <p>{approvalNote}</p>
        </div>

        {flow.requestError ? (
          <p className="registration-error" role="alert">
            {flow.requestError}
          </p>
        ) : null}

        <div className="registration-actions">
          <button
            className="primary-button"
            type="submit"
            disabled={flow.isSubmitting}
          >
            {flow.isSubmitting ? 'Enviando…' : 'Recibir un código'}
            <ChevronRight aria-hidden="true" size={17} />
          </button>
        </div>
      </form>
    )
  }

  return (
    <form
      aria-busy={flow.isSubmitting}
      className="registration-form"
      onSubmit={handleOtpSubmit}
    >
      <div className="registration-form__heading">
        <span>Segunda etapa</span>
        <h2>Código de verificación</h2>
        <p>
          Hemos enviado seis cifras a <strong>{flow.email}</strong>.
        </p>
      </div>

      <label className="form-field registration-otp-field">
        <span>Código de seis cifras</span>
        <span className="registration-input-with-icon">
          <KeyRound aria-hidden="true" size={18} />
          <input
            required
            autoFocus
            aria-describedby="otp-help"
            autoComplete="one-time-code"
            className="registration-code-input"
            disabled={
              flow.isOtpExpired || flow.isOtpLocked || flow.isSubmitting
            }
            inputMode="numeric"
            maxLength={6}
            pattern="[0-9]{6}"
            placeholder="000000"
            value={flow.otp}
            onChange={(event) =>
              flow.setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
            }
          />
        </span>
      </label>

      <div className="registration-otp-meta" id="otp-help">
        <span>
          <Clock3 aria-hidden="true" size={16} />
          {flow.isOtpExpired
            ? 'Código caducado'
            : `Caduca en ${formatOtpCountdown(flow.expirationRemaining)}`}
        </span>
        <span>{flow.attemptsRemaining} intentos disponibles</span>
      </div>

      {flow.otpError ? (
        <p className="registration-error" role="alert">
          {flow.otpError}
        </p>
      ) : null}

      <div className="registration-actions registration-actions--split">
        <button
          className="secondary-button"
          type="button"
          disabled={flow.isSubmitting}
          onClick={() => {
            flow.changeEmail()
            onStageChange('access')
          }}
        >
          Cambiar correo
        </button>
        <button
          className="primary-button"
          type="submit"
          disabled={
            flow.isSubmitting ||
            flow.isOtpExpired ||
            flow.isOtpLocked ||
            flow.otp.length !== 6
          }
        >
          {flow.isSubmitting ? 'Verificando…' : 'Verificar código'}
        </button>
      </div>

      <button
        className="registration-resend"
        type="button"
        disabled={flow.isSubmitting || flow.resendRemaining > 0}
        onClick={() => void flow.requestCode()}
      >
        <RefreshCw aria-hidden="true" size={15} />
        {flow.resendRemaining > 0
          ? `Reenviar dentro de ${flow.resendRemaining} s`
          : 'Reenviar el código'}
      </button>
    </form>
  )
}

function ShieldNoteIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <path
        d="M12 3 5 6v5c0 4.7 2.9 8.3 7 10 4.1-1.7 7-5.3 7-10V6l-7-3Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="m9.5 12 1.6 1.6 3.5-3.7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}
