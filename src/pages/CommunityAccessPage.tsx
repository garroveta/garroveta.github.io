import {
  Ban,
  CircleAlert,
  Clock3,
  KeyRound,
  LoaderCircle,
  LogIn,
  ShieldAlert,
  UserRoundCheck,
  WifiOff,
} from 'lucide-react'

import { describeApiError, type ApiErrorKind } from '../api/errorPresentation'
import { PublicAccessShell } from '../components/PublicAccessShell'
import type { Community } from '../domain/types'

type CommunityAccessState =
  'authenticated' | 'error' | 'loading' | 'missing' | 'pending' | 'suspended'

type CommunityAccessPageProps = {
  community: Community
  email?: string
  error?: unknown
  onAction?: () => void
  state: CommunityAccessState
}

const errorEyebrowByKind: Record<ApiErrorKind, string> = {
  access_denied: 'Acceso restringido',
  network: 'Sin conexión',
  session_expired: 'Sesión caducada',
  unknown: 'Problema inesperado',
}

const errorIconByKind: Record<ApiErrorKind, typeof Clock3> = {
  access_denied: ShieldAlert,
  network: WifiOff,
  session_expired: KeyRound,
  unknown: CircleAlert,
}

const accessContent: Record<
  Exclude<CommunityAccessState, 'error'>,
  {
    actionLabel?: string
    description: string
    eyebrow: string
    icon: typeof Clock3
    title: string
  }
> = {
  authenticated: {
    actionLabel: 'Entrar en Garroveta',
    description: 'Tu sesión está activa y tu acceso a la comunidad está listo.',
    eyebrow: 'Acceso confirmado',
    icon: UserRoundCheck,
    title: 'Ya puedes entrar',
  },
  loading: {
    description: 'Estamos comprobando tu sesión y tu acceso a la comunidad.',
    eyebrow: 'Acceso privado',
    icon: LoaderCircle,
    title: 'Comprobando tu acceso',
  },
  missing: {
    description:
      'Tu cuenta existe, pero todavía no pertenece a esta comunidad. Solicita una invitación al gerente.',
    eyebrow: 'Invitación necesaria',
    icon: LogIn,
    title: 'Aún no tienes acceso',
  },
  pending: {
    description:
      'El gerente o un moderador debe validar tu solicitud antes de que puedas entrar.',
    eyebrow: 'Solicitud recibida',
    icon: Clock3,
    title: 'Tu acceso está pendiente',
  },
  suspended: {
    description:
      'Tu acceso a esta comunidad está suspendido. Contacta con el gerente para obtener más información.',
    eyebrow: 'Acceso bloqueado',
    icon: Ban,
    title: 'Tu acceso está suspendido',
  },
}

export function CommunityAccessPage({
  community,
  email,
  error,
  onAction,
  state,
}: CommunityAccessPageProps) {
  const content =
    state === 'error'
      ? (() => {
          const presentation = describeApiError(error)

          return {
            actionLabel: 'Volver a intentarlo',
            description: presentation.description,
            eyebrow: errorEyebrowByKind[presentation.kind],
            icon: errorIconByKind[presentation.kind],
            title: presentation.title,
          }
        })()
      : accessContent[state]
  const Icon = content.icon

  return (
    <PublicAccessShell community={community}>
      <div className="community-access-page" aria-live="polite">
        <section
          className={`community-access-card community-access-card--${state}`}
        >
          <span className="community-access-card__icon" aria-hidden="true">
            <Icon className={state === 'loading' ? 'is-spinning' : undefined} />
          </span>
          <span className="page-eyebrow">{content.eyebrow}</span>
          <h1>{content.title}</h1>
          <p>{content.description}</p>
          {email ? (
            <p className="community-access-card__account">
              Cuenta conectada: <strong>{email}</strong>
            </p>
          ) : null}
          {content.actionLabel && onAction ? (
            <button className="primary-button" type="button" onClick={onAction}>
              {content.actionLabel}
            </button>
          ) : null}
        </section>
      </div>
    </PublicAccessShell>
  )
}
