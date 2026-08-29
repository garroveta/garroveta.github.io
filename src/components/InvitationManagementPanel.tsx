import {
  CalendarClock,
  CheckCircle2,
  CircleSlash2,
  Clock3,
  KeyRound,
  Mail,
  QrCode,
  RefreshCw,
} from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'

import { sendSignInOtp, verifySignInOtp } from '../api/authentication'
import {
  listCommunityInvitations,
  type ManagerInvitation,
  type ManagerInvitationStatus,
} from '../api/managerInvitations'
import { ClientApiError } from '../api/client'

type InvitationManagementPanelProps = {
  communityId: string
}

const statusLabels: Record<ManagerInvitationStatus, string> = {
  active: 'Activa',
  expired: 'Caducada',
  revoked: 'Revocada',
  used: 'Utilizada',
}

const statusIcons = {
  active: Clock3,
  expired: CalendarClock,
  revoked: CircleSlash2,
  used: CheckCircle2,
} satisfies Record<ManagerInvitationStatus, typeof Clock3>

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

type ManagerOtpLoginProps = {
  accessDenied: boolean
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

function ManagerOtpLogin({
  accessDenied,
  onAuthenticated,
}: ManagerOtpLoginProps) {
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

export function InvitationManagementPanel({
  communityId,
}: InvitationManagementPanelProps) {
  const [invitations, setInvitations] = useState<ManagerInvitation[]>([])
  const [loadState, setLoadState] = useState<
    | 'authentication-required'
    | 'error'
    | 'loading'
    | 'manager-access-required'
    | 'ready'
  >('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const counts = useMemo(
    () =>
      invitations.reduce<Record<ManagerInvitationStatus, number>>(
        (result, invitation) => ({
          ...result,
          [invitation.status]: result[invitation.status] + 1,
        }),
        { active: 0, expired: 0, revoked: 0, used: 0 },
      ),
    [invitations],
  )

  useEffect(() => {
    const controller = new AbortController()

    void listCommunityInvitations(communityId, controller.signal)
      .then(({ invitations: loadedInvitations }) => {
        setInvitations(loadedInvitations)
        setLoadState('ready')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        if (error instanceof ClientApiError && error.status === 401) {
          setLoadState('authentication-required')
        } else if (error instanceof ClientApiError && error.status === 403) {
          setLoadState('manager-access-required')
        } else {
          setLoadState('error')
        }
      })

    return () => controller.abort()
  }, [communityId, reloadKey])

  const retry = () => {
    setLoadState('loading')
    setReloadKey((key) => key + 1)
  }

  return (
    <section
      className="invitation-management-panel"
      aria-labelledby="invitation-management-title"
    >
      <div className="configuration-panel-heading">
        <span aria-hidden="true">
          <QrCode size={20} />
        </span>
        <div>
          <span>Acceso por QR</span>
          <h2 id="invitation-management-title">Invitaciones</h2>
          <p>
            Consulta los enlaces creados y comprueba cuáles siguen disponibles.
          </p>
        </div>
      </div>

      {loadState === 'loading' ? (
        <div className="invitation-management-state" aria-live="polite">
          <RefreshCw aria-hidden="true" size={20} />
          <strong>Cargando invitaciones…</strong>
        </div>
      ) : loadState === 'authentication-required' ||
        loadState === 'manager-access-required' ? (
        <ManagerOtpLogin
          accessDenied={loadState === 'manager-access-required'}
          onAuthenticated={retry}
        />
      ) : loadState === 'error' ? (
        <div className="invitation-management-state" role="alert">
          <CircleSlash2 aria-hidden="true" size={20} />
          <div>
            <strong>No se han podido cargar las invitaciones</strong>
            <p>Comprueba la conexión y vuelve a intentarlo.</p>
          </div>
          <button className="secondary-button" type="button" onClick={retry}>
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div
            className="invitation-status-summary"
            aria-label="Resumen de invitaciones"
          >
            {(Object.keys(statusLabels) as ManagerInvitationStatus[]).map(
              (status) => (
                <span data-status={status} key={status}>
                  <strong>{counts[status]}</strong>
                  {statusLabels[status]}
                </span>
              ),
            )}
          </div>

          {invitations.length === 0 ? (
            <div className="invitation-management-empty">
              <QrCode aria-hidden="true" size={24} />
              <strong>Todavía no hay invitaciones</strong>
              <p>
                La creación del primer enlace se añadirá en el siguiente paso.
              </p>
            </div>
          ) : (
            <div className="managed-invitation-list">
              {invitations.map((invitation) => {
                const StatusIcon = statusIcons[invitation.status]

                return (
                  <article
                    className="managed-invitation-row"
                    key={invitation.id}
                  >
                    <div className="managed-invitation-row__identity">
                      <strong>
                        {invitation.label?.trim() || 'Invitación sin nombre'}
                      </strong>
                      <span>
                        Creada el {formatDate(invitation.createdAt)} · Caduca el{' '}
                        {formatDate(invitation.expiresAt)}
                      </span>
                    </div>
                    <span
                      className="managed-invitation-status"
                      data-status={invitation.status}
                    >
                      <StatusIcon aria-hidden="true" size={14} />
                      {statusLabels[invitation.status]}
                    </span>
                  </article>
                )
              })}
            </div>
          )}
        </>
      )}
    </section>
  )
}
