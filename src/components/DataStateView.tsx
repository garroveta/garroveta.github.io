import {
  CircleAlert,
  KeyRound,
  LoaderCircle,
  ShieldAlert,
  WifiOff,
  type LucideIcon,
} from 'lucide-react'

import { describeApiError, type ApiErrorKind } from '../api/errorPresentation'

const iconByErrorKind: Record<ApiErrorKind, LucideIcon> = {
  access_denied: ShieldAlert,
  network: WifiOff,
  session_expired: KeyRound,
  unknown: CircleAlert,
}

export type DataStateViewProps = {
  error?: unknown
  loadingDescription?: string
  loadingTitle: string
  onRetry?: () => void
  retryLabel?: string
  status: 'error' | 'loading'
  variant?: 'page' | 'panel'
}

export function DataStateView({
  error,
  loadingDescription,
  loadingTitle,
  onRetry,
  retryLabel = 'Reintentar',
  status,
  variant = 'panel',
}: DataStateViewProps) {
  const isLoading = status === 'loading'
  const presentation = isLoading ? null : describeApiError(error)
  const Icon = isLoading ? LoaderCircle : iconByErrorKind[presentation!.kind]
  const title = isLoading ? loadingTitle : presentation!.title
  const description = isLoading ? loadingDescription : presentation!.description
  const showRetry = !isLoading && presentation!.canRetry && Boolean(onRetry)

  return (
    <div
      className={`data-state-view data-state-view--${variant}`}
      aria-live={isLoading ? 'polite' : undefined}
      role={isLoading ? undefined : 'alert'}
    >
      <span className="data-state-view__icon" aria-hidden="true">
        <Icon
          className={isLoading ? 'spin' : undefined}
          size={variant === 'page' ? 24 : 20}
        />
      </span>
      <div className="data-state-view__copy">
        {variant === 'page' ? <h2>{title}</h2> : <strong>{title}</strong>}
        {description ? <p>{description}</p> : null}
      </div>
      {showRetry ? (
        <button
          className={variant === 'page' ? 'primary-button' : 'secondary-button'}
          type="button"
          onClick={onRetry}
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  )
}
