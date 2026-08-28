import {
  CalendarClock,
  CheckCircle2,
  CircleSlash2,
  Clock3,
  QrCode,
  RefreshCw,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

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

export function InvitationManagementPanel({
  communityId,
}: InvitationManagementPanelProps) {
  const [invitations, setInvitations] = useState<ManagerInvitation[]>([])
  const [loadState, setLoadState] = useState<
    'authentication-required' | 'error' | 'loading' | 'ready'
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

        setLoadState(
          error instanceof ClientApiError &&
            (error.status === 401 || error.status === 403)
            ? 'authentication-required'
            : 'error',
        )
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
      ) : loadState === 'authentication-required' ? (
        <div className="invitation-management-state" role="alert">
          <CircleSlash2 aria-hidden="true" size={20} />
          <div>
            <strong>Se necesita una sesión de gerente</strong>
            <p>
              Inicia sesión con una cuenta gerente aprobada para consultar las
              invitaciones reales.
            </p>
          </div>
          <button className="secondary-button" type="button" onClick={retry}>
            Reintentar
          </button>
        </div>
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
