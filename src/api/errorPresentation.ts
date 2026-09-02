import { ClientApiError } from './client'

export type ApiErrorKind =
  'access_denied' | 'network' | 'session_expired' | 'unknown'

export type ApiErrorPresentation = {
  canRetry: boolean
  description: string
  kind: ApiErrorKind
  title: string
}

const presentationByKind: Record<
  ApiErrorKind,
  Omit<ApiErrorPresentation, 'kind'>
> = {
  access_denied: {
    canRetry: false,
    description:
      'Tu cuenta no tiene los permisos necesarios para ver esta sección. Contacta con el gerente si crees que es un error.',
    title: 'No tienes acceso a esta sección',
  },
  network: {
    canRetry: true,
    description:
      'No hemos podido conectar con el servidor. Comprueba tu conexión a internet e inténtalo de nuevo.',
    title: 'Sin conexión',
  },
  session_expired: {
    canRetry: false,
    description:
      'Tu sesión ha caducado. Vuelve a iniciar sesión para continuar.',
    title: 'Tu sesión ha caducado',
  },
  unknown: {
    canRetry: true,
    description:
      'No se ha podido completar la solicitud. Inténtalo de nuevo en unos minutos.',
    title: 'Ha ocurrido un error',
  },
}

function getApiErrorKind(error: unknown): ApiErrorKind {
  if (error instanceof ClientApiError) {
    if (error.code === 'network_error') {
      return 'network'
    }

    if (error.status === 401) {
      return 'session_expired'
    }

    if (error.status === 403) {
      return 'access_denied'
    }
  }

  return 'unknown'
}

export function describeApiError(error: unknown): ApiErrorPresentation {
  const kind = getApiErrorKind(error)

  return { kind, ...presentationByKind[kind] }
}
