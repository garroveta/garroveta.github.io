import {
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  KeyRound,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { useEffect, useState } from 'react'

import {
  redeemInvitation,
  sendSignInOtp,
  validateInvitation,
  verifySignInOtp,
  type InvitationStatus,
} from '../api/registration'
import { ClientApiError } from '../api/client'
import { isCommunityOptionActive } from '../data/communityOptions'
import type { Community, CommunityGame, CommunityTag } from '../domain/types'

type RegistrationPageProps = {
  community: Community
  games: CommunityGame[]
  invitationToken: string | null
  tags: CommunityTag[]
  onComplete: () => void
}

type RegistrationStep = 'access' | 'verification' | 'profile' | 'complete'
type InvitationViewState = InvitationStatus | 'error' | 'loading' | 'missing'

const OTP_EXPIRATION_SECONDS = 10 * 60
const OTP_RESEND_DELAY_SECONDS = 30
const OTP_MAX_ATTEMPTS = 3
const INVITATION_SESSION_KEY = 'garroveta.registration.invitation'
const INVITATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

type RegistrationShellProps = {
  children: ReactNode
  community: Community
}

function RegistrationShell({ children, community }: RegistrationShellProps) {
  return (
    <div className="registration-shell">
      <header className="registration-site-header">
        <span className="registration-brand" aria-label="Garroveta">
          <span
            className={`brand__mark${community.logoUrl ? ' brand__mark--image' : ''}`}
            aria-hidden="true"
          >
            {community.logoUrl ? <img src={community.logoUrl} alt="" /> : 'G'}
          </span>
          <span className="brand__text">
            <strong>Garroveta</strong>
            <small>
              {community.name} · {community.city}
            </small>
          </span>
        </span>
        <span className="registration-access-badge">
          <ShieldCheck aria-hidden="true" size={16} />
          Acceso por invitación
        </span>
      </header>
      <main className="registration-main" id="main-content">
        {children}
      </main>
    </div>
  )
}

export function RegistrationPage({
  community,
  games,
  invitationToken,
  tags,
  onComplete,
}: RegistrationPageProps) {
  const activeGames = games.filter(isCommunityOptionActive)
  const activeTags = tags.filter(isCommunityOptionActive)
  const [step, setStep] = useState<RegistrationStep>('access')
  const [invitationRetry, setInvitationRetry] = useState(0)
  const [invite] = useState(() => {
    if (invitationToken !== null) {
      return invitationToken
    }

    return window.sessionStorage.getItem(INVITATION_SESSION_KEY) ?? ''
  })
  const [invitationState, setInvitationState] = useState<InvitationViewState>(
    () =>
      invite
        ? INVITATION_TOKEN_PATTERN.test(invite)
          ? 'loading'
          : 'invalid'
        : 'missing',
  )
  const [invitedCommunity, setInvitedCommunity] = useState<{
    city?: string
    name?: string
  } | null>(null)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpAttempts, setOtpAttempts] = useState(0)
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [otpError, setOtpError] = useState('')
  const [requestError, setRequestError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [acceptedRules, setAcceptedRules] = useState(false)
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(() =>
    community.suggestedTagIds.filter((tagId) =>
      activeTags.some(({ id }) => id === tagId),
    ),
  )

  useEffect(() => {
    if (!invite) {
      return
    }

    if (!INVITATION_TOKEN_PATTERN.test(invite)) {
      window.sessionStorage.removeItem(INVITATION_SESSION_KEY)
      return
    }

    window.sessionStorage.setItem(INVITATION_SESSION_KEY, invite)

    if (window.location.hash !== '#registro') {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}#registro`,
      )
    }

    const controller = new AbortController()

    void validateInvitation(invite, controller.signal)
      .then((validation) => {
        setInvitedCommunity(validation.community ?? null)
        setInvitationState(validation.status)

        if (validation.status !== 'active') {
          window.sessionStorage.removeItem(INVITATION_SESSION_KEY)
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setInvitationState('error')
      })

    return () => controller.abort()
  }, [invite, invitationRetry])

  useEffect(() => {
    if (step !== 'verification') {
      return
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [step])

  const elapsedSeconds = otpSentAt ? Math.floor((now - otpSentAt) / 1000) : 0
  const expirationRemaining = Math.max(
    0,
    OTP_EXPIRATION_SECONDS - elapsedSeconds,
  )
  const resendRemaining = Math.max(0, OTP_RESEND_DELAY_SECONDS - elapsedSeconds)
  const attemptsRemaining = Math.max(0, OTP_MAX_ATTEMPTS - otpAttempts)
  const isOtpExpired = expirationRemaining === 0
  const isOtpLocked = attemptsRemaining === 0

  const toggleSelection = (
    id: string,
    selectedIds: string[],
    setSelectedIds: (ids: string[]) => void,
  ) => {
    setSelectedIds(
      selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id],
    )
  }

  const startOtp = async () => {
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
      return
    }

    const sentAt = Date.now()
    setOtp('')
    setOtpAttempts(0)
    setOtpError('')
    setOtpSentAt(sentAt)
    setNow(sentAt)
    setStep('verification')
    setIsSubmitting(false)
  }

  const handleAccessSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await startOtp()
  }

  const handleOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isOtpExpired) {
      setOtpError('El código ha caducado. Solicita uno nuevo.')
      return
    }

    if (isOtpLocked) {
      setOtpError('Has agotado los tres intentos. Solicita un código nuevo.')
      return
    }

    setIsSubmitting(true)
    setOtpError('')

    try {
      await verifySignInOtp(email.trim(), otp)
      setStep('profile')
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
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setRequestError('')

    try {
      await redeemInvitation({
        displayName: displayName.trim(),
        favoriteGameIds: selectedGameIds,
        invite,
        tagIds: selectedTagIds,
      })
      window.sessionStorage.removeItem(INVITATION_SESSION_KEY)
      setStep('complete')
    } catch (error) {
      const code = error instanceof ClientApiError ? error.code : ''
      const invitationErrors: Record<string, string> = {
        already_member: 'Ya perteneces a esta comunidad.',
        expired: 'La invitación ha caducado.',
        invalid: 'La invitación ya no es válida.',
        membership_suspended:
          'Tu acceso está suspendido. Contacta con el gerente.',
        revoked: 'La invitación ha sido revocada.',
        used: 'Otra persona ya ha utilizado esta invitación.',
      }

      setRequestError(
        invitationErrors[code] ??
          'No se ha podido completar el perfil. Inténtalo de nuevo.',
      )

      if (
        code === 'expired' ||
        code === 'invalid' ||
        code === 'revoked' ||
        code === 'used'
      ) {
        window.sessionStorage.removeItem(INVITATION_SESSION_KEY)
        setInvitationState(code)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const progressSteps = [
    { id: 'access', label: 'Acceso' },
    { id: 'verification', label: 'Código' },
    { id: 'profile', label: 'Perfil' },
  ] as const
  const currentProgressIndex = progressSteps.findIndex(({ id }) => id === step)

  if (invitationState === 'loading') {
    return (
      <RegistrationShell community={community}>
        <div className="page registration-page">
          <section className="registration-pending" aria-live="polite">
            <span className="registration-pending__icon" aria-hidden="true">
              <ShieldCheck size={32} />
            </span>
            <span className="page-eyebrow">Acceso al piloto</span>
            <h1>Comprobando la invitación</h1>
            <p>Estamos verificando que este enlace siga siendo válido.</p>
          </section>
        </div>
      </RegistrationShell>
    )
  }

  if (invitationState !== 'active') {
    const invitationMessages: Record<
      Exclude<InvitationViewState, 'active' | 'loading'>,
      { description: string; title: string }
    > = {
      error: {
        description:
          'No hemos podido comprobar el enlace. Revisa tu conexión y vuelve a intentarlo.',
        title: 'No se ha podido verificar la invitación',
      },
      expired: {
        description:
          'Este enlace ha caducado. Pide una nueva invitación al gerente o a un moderador.',
        title: 'La invitación ha caducado',
      },
      invalid: {
        description:
          'El enlace está incompleto o no corresponde a una invitación de Garroveta.',
        title: 'Invitación no válida',
      },
      missing: {
        description:
          'Para crear una cuenta necesitas abrir el enlace privado enviado por el gerente o un moderador.',
        title: 'Necesitas una invitación',
      },
      revoked: {
        description:
          'Este enlace ha sido revocado. Pide una nueva invitación al gerente o a un moderador.',
        title: 'La invitación ya no está activa',
      },
      used: {
        description:
          'Este enlace ya se ha utilizado y no puede servir para otra cuenta.',
        title: 'Invitación ya utilizada',
      },
    }
    const message = invitationMessages[invitationState]

    return (
      <RegistrationShell community={community}>
        <div className="page registration-page">
          <section className="registration-pending" aria-live="polite">
            <span className="registration-pending__icon" aria-hidden="true">
              <ShieldCheck size={32} />
            </span>
            <span className="page-eyebrow">Acceso al piloto</span>
            <h1>{message.title}</h1>
            <p>{message.description}</p>
            {invitationState === 'error' ? (
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  setInvitationState('loading')
                  setInvitationRetry((retry) => retry + 1)
                }}
              >
                Volver a intentarlo
              </button>
            ) : null}
          </section>
        </div>
      </RegistrationShell>
    )
  }

  if (step === 'complete') {
    return (
      <RegistrationShell community={community}>
        <div className="page registration-page">
          <section className="registration-pending" aria-live="polite">
            <span className="registration-pending__icon" aria-hidden="true">
              <CheckCircle2 size={32} />
            </span>
            <span className="page-eyebrow">Perfil completado</span>
            <h1>Ya puedes entrar en {community.name}</h1>
            <p>
              La identidad de <strong>{displayName}</strong> se ha verificado
              con el código enviado a <strong>{email}</strong>.
            </p>

            <div className="registration-status-card">
              <ShieldCheck aria-hidden="true" size={20} />
              <div>
                <strong>Acceso mediante invitación</strong>
                <p>
                  No necesitas recordar ninguna contraseña. Tu acceso queda
                  protegido mediante códigos temporales enviados por correo.
                </p>
              </div>
            </div>

            <button
              className="primary-button"
              type="button"
              onClick={onComplete}
            >
              Entrar en Garroveta
            </button>
          </section>
        </div>
      </RegistrationShell>
    )
  }

  return (
    <RegistrationShell community={community}>
      <div className="page registration-page">
        <header className="registration-heading">
          <span className="page-eyebrow">
            <UserPlus aria-hidden="true" size={15} />
            Acceso al piloto
          </span>
          <h1>Únete a la comunidad</h1>
          <p>
            El acceso a {community.name} está reservado a las personas
            invitadas. Solo necesitas tu correo y un código temporal.
          </p>
        </header>

        <ol
          className="registration-progress"
          aria-label="Progreso del registro"
        >
          {progressSteps.map(({ id, label }, index) => {
            const isCurrent = step === id
            const isComplete = currentProgressIndex > index

            return (
              <li
                aria-current={isCurrent ? 'step' : undefined}
                className={isComplete ? 'registration-progress__complete' : ''}
                key={id}
              >
                <span>{isComplete ? <Check size={15} /> : index + 1}</span>
                {label}
              </li>
            )
          })}
        </ol>

        {step === 'access' ? (
          <form
            aria-busy={isSubmitting}
            className="registration-form"
            onSubmit={handleAccessSubmit}
          >
            <div className="registration-form__heading">
              <span>Primera etapa</span>
              <h2>Acceso al piloto</h2>
              <p>
                Introduce el correo que recibió la invitación de la comunidad.
              </p>
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
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </span>
            </label>

            <div className="registration-approval-note">
              <ShieldCheck aria-hidden="true" size={20} />
              <p>
                <strong>Comunidad privada</strong>
                Esta invitación permite solicitar acceso a{' '}
                {invitedCommunity?.name ?? community.name}
                {invitedCommunity?.city ? `, ${invitedCommunity.city}` : ''}. El
                código se enviará al correo que indiques.
              </p>
            </div>

            {requestError ? (
              <p className="registration-error" role="alert">
                {requestError}
              </p>
            ) : null}

            <div className="registration-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Enviando…' : 'Recibir un código'}
                <ChevronRight aria-hidden="true" size={17} />
              </button>
            </div>
          </form>
        ) : step === 'verification' ? (
          <form
            aria-busy={isSubmitting}
            className="registration-form"
            onSubmit={handleOtpSubmit}
          >
            <div className="registration-form__heading">
              <span>Segunda etapa</span>
              <h2>Código de verificación</h2>
              <p>
                Hemos enviado seis cifras a <strong>{email}</strong>.
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
                  disabled={isOtpExpired || isOtpLocked || isSubmitting}
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  placeholder="000000"
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                />
              </span>
            </label>

            <div className="registration-otp-meta" id="otp-help">
              <span>
                <Clock3 aria-hidden="true" size={16} />
                {isOtpExpired
                  ? 'Código caducado'
                  : `Caduca en ${formatCountdown(expirationRemaining)}`}
              </span>
              <span>{attemptsRemaining} intentos disponibles</span>
            </div>

            {otpError ? (
              <p className="registration-error" role="alert">
                {otpError}
              </p>
            ) : null}

            <div className="registration-actions registration-actions--split">
              <button
                className="secondary-button"
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setRequestError('')
                  setStep('access')
                }}
              >
                Cambiar correo
              </button>
              <button
                className="primary-button"
                type="submit"
                disabled={
                  isSubmitting ||
                  isOtpExpired ||
                  isOtpLocked ||
                  otp.length !== 6
                }
              >
                {isSubmitting ? 'Verificando…' : 'Verificar código'}
              </button>
            </div>

            <button
              className="registration-resend"
              type="button"
              disabled={isSubmitting || resendRemaining > 0}
              onClick={() => void startOtp()}
            >
              <RefreshCw aria-hidden="true" size={15} />
              {resendRemaining > 0
                ? `Reenviar dentro de ${resendRemaining} s`
                : 'Reenviar el código'}
            </button>
          </form>
        ) : (
          <form
            aria-busy={isSubmitting}
            className="registration-form"
            onSubmit={handleProfileSubmit}
          >
            <div className="registration-form__heading">
              <span>Tercera etapa</span>
              <h2>Completa tu perfil</h2>
              <p>Elige el nombre y los intereses que verá la comunidad.</p>
            </div>

            <label className="form-field">
              <span>Nombre visible</span>
              <input
                required
                autoComplete="name"
                placeholder="Ej. Marina Valverde"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>

            <fieldset className="registration-choice-group">
              <legend>Mis juegos</legend>
              <p>Selecciona al menos un juego.</p>
              <div className="registration-game-options">
                {activeGames.map((game) => {
                  const isSelected = selectedGameIds.includes(game.id)

                  return (
                    <button
                      type="button"
                      key={game.id}
                      aria-pressed={isSelected}
                      onClick={() =>
                        toggleSelection(
                          game.id,
                          selectedGameIds,
                          setSelectedGameIds,
                        )
                      }
                    >
                      <span
                        className="registration-game-color"
                        style={{ '--game-color': game.color } as CSSProperties}
                        aria-hidden="true"
                      />
                      <span>{game.shortName}</span>
                      <span
                        className="registration-choice-check"
                        aria-hidden="true"
                      >
                        {isSelected ? (
                          <Check size={14} strokeWidth={3} />
                        ) : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <fieldset className="registration-choice-group">
              <legend>Mis grupos favoritos</legend>
              <p>Puedes cambiar esta selección más adelante.</p>
              <div className="registration-tag-options">
                {activeTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id)

                  return (
                    <button
                      type="button"
                      key={tag.id}
                      aria-pressed={isSelected}
                      onClick={() =>
                        toggleSelection(
                          tag.id,
                          selectedTagIds,
                          setSelectedTagIds,
                        )
                      }
                    >
                      {tag.name}
                      {isSelected ? (
                        <Check aria-hidden="true" size={14} strokeWidth={3} />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <label className="registration-rules">
              <input
                required
                type="checkbox"
                checked={acceptedRules}
                onChange={(event) => setAcceptedRules(event.target.checked)}
              />
              <span>
                <strong>Acepto las normas de la comunidad</strong>
                Mis datos serán visibles únicamente para los miembros validados.
              </span>
            </label>

            {requestError ? (
              <p className="registration-error" role="alert">
                {requestError}
              </p>
            ) : null}

            <div className="registration-actions registration-actions--split">
              <button
                className="secondary-button"
                type="button"
                disabled={isSubmitting}
                onClick={() => setStep('verification')}
              >
                Atrás
              </button>
              <button
                className="primary-button"
                type="submit"
                disabled={
                  isSubmitting || selectedGameIds.length === 0 || !acceptedRules
                }
              >
                {isSubmitting ? 'Guardando…' : 'Completar perfil'}
              </button>
            </div>
          </form>
        )}
      </div>
    </RegistrationShell>
  )
}
