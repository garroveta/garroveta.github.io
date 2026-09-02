import {
  CalendarClock,
  Check,
  CheckCircle2,
  CircleSlash2,
  Clock3,
  Copy,
  Link2,
  Plus,
  QrCode,
  RefreshCw,
  X,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'

import {
  createCommunityInvitation,
  type CreatedManagerInvitation,
  listCommunityInvitations,
  type ManagerInvitation,
  type ManagerInvitationStatus,
} from '../api/managerInvitations'
import { ClientApiError } from '../api/client'
import { ManagerOtpLogin } from './ManagerOtpLogin'

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
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [creationError, setCreationError] = useState('')
  const [label, setLabel] = useState('')
  const [expiresInDays, setExpiresInDays] = useState(30)
  const [createdInvitation, setCreatedInvitation] =
    useState<CreatedManagerInvitation | null>(null)
  const [copyState, setCopyState] = useState<'copied' | 'error' | 'idle'>(
    'idle',
  )
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

  const createInvitation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsCreating(true)
    setCreationError('')

    try {
      const { invitation } = await createCommunityInvitation(communityId, {
        expiresInDays,
        label: label.trim() || null,
      })

      setInvitations((currentInvitations) => [
        invitation,
        ...currentInvitations,
      ])
      setCreatedInvitation(invitation)
      setCopyState('idle')
      setLabel('')
      setExpiresInDays(30)
      setIsCreateFormOpen(false)
    } catch (error) {
      if (error instanceof ClientApiError && error.status === 401) {
        setIsCreateFormOpen(false)
        setLoadState('authentication-required')
      } else if (error instanceof ClientApiError && error.status === 403) {
        setIsCreateFormOpen(false)
        setLoadState('manager-access-required')
      } else {
        setCreationError(
          'No se ha podido crear la invitación. Vuelve a intentarlo.',
        )
      }
    } finally {
      setIsCreating(false)
    }
  }

  const copyInvitationLink = async () => {
    if (!createdInvitation) {
      return
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard unavailable')
      }

      await navigator.clipboard.writeText(createdInvitation.inviteUrl)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
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
          kind={
            loadState === 'manager-access-required'
              ? 'access_denied'
              : 'session_expired'
          }
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
          <div className="invitation-creation-toolbar">
            <div>
              <strong>Invita a un nuevo miembro</strong>
              <span>El enlace tendrá un único uso.</span>
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setCreationError('')
                setIsCreateFormOpen((isOpen) => !isOpen)
              }}
            >
              {isCreateFormOpen ? (
                <X aria-hidden="true" size={16} />
              ) : (
                <Plus aria-hidden="true" size={16} />
              )}
              {isCreateFormOpen ? 'Cerrar' : 'Nueva invitación'}
            </button>
          </div>

          {isCreateFormOpen ? (
            <form
              className="invitation-creation-form"
              onSubmit={createInvitation}
            >
              <div className="invitation-creation-form__fields">
                <label className="form-field">
                  Nombre interno (opcional)
                  <input
                    maxLength={120}
                    name="invitation-label"
                    placeholder="Ej. Grupo piloto de septiembre"
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                  />
                </label>
                <label className="form-field">
                  Validez
                  <select
                    name="invitation-expiration"
                    value={expiresInDays}
                    onChange={(event) =>
                      setExpiresInDays(Number(event.target.value))
                    }
                  >
                    <option value={1}>1 día</option>
                    <option value={7}>7 días</option>
                    <option value={14}>14 días</option>
                    <option value={30}>30 días</option>
                    <option value={60}>60 días</option>
                    <option value={90}>90 días</option>
                  </select>
                </label>
              </div>
              <p>
                El nombre solo ayuda a identificar el enlace y no se muestra al
                futuro miembro.
              </p>
              {creationError ? (
                <p className="registration-error" role="alert">
                  {creationError}
                </p>
              ) : null}
              <button
                className="primary-button"
                disabled={isCreating}
                type="submit"
              >
                <Plus aria-hidden="true" size={16} />
                {isCreating ? 'Creando…' : 'Crear invitación'}
              </button>
            </form>
          ) : null}

          {createdInvitation ? (
            <section
              className="created-invitation-secret"
              aria-labelledby="created-invitation-title"
            >
              <div className="created-invitation-secret__heading">
                <Link2 aria-hidden="true" size={20} />
                <div>
                  <strong id="created-invitation-title">
                    Comparte esta invitación ahora
                  </strong>
                  <p>
                    El QR y el enlace secreto no podrán recuperarse después de
                    cerrar este aviso.
                  </p>
                </div>
                <button
                  aria-label="Ocultar el enlace de invitación"
                  className="icon-button"
                  type="button"
                  onClick={() => {
                    setCreatedInvitation(null)
                    setCopyState('idle')
                  }}
                >
                  <X aria-hidden="true" size={17} />
                </button>
              </div>

              <div className="created-invitation-secret__content">
                <div className="created-invitation-qr">
                  <QRCodeSVG
                    bgColor="#ffffff"
                    fgColor="#2f2135"
                    level="M"
                    marginSize={4}
                    size={184}
                    title="Código QR de la nueva invitación"
                    value={createdInvitation.inviteUrl}
                  />
                  <span>Escanear para registrarse</span>
                </div>

                <div className="created-invitation-share">
                  <div>
                    <span>Invitación</span>
                    <strong>
                      {createdInvitation.label?.trim() ||
                        'Invitación sin nombre'}
                    </strong>
                    <small>
                      Válida hasta el {formatDate(createdInvitation.expiresAt)}
                    </small>
                  </div>
                  <label>
                    Enlace de acceso
                    <input
                      aria-label="Enlace de la nueva invitación"
                      readOnly
                      value={createdInvitation.inviteUrl}
                      onFocus={(event) => event.currentTarget.select()}
                    />
                  </label>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => void copyInvitationLink()}
                  >
                    {copyState === 'copied' ? (
                      <Check aria-hidden="true" size={16} />
                    ) : (
                      <Copy aria-hidden="true" size={16} />
                    )}
                    {copyState === 'copied'
                      ? 'Enlace copiado'
                      : 'Copiar enlace'}
                  </button>
                  <span
                    className="created-invitation-copy-status"
                    aria-live="polite"
                  >
                    {copyState === 'copied'
                      ? 'Ya puedes pegarlo en WhatsApp.'
                      : copyState === 'error'
                        ? 'Selecciona el enlace y cópialo manualmente.'
                        : ''}
                  </span>
                </div>
              </div>
            </section>
          ) : null}

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
