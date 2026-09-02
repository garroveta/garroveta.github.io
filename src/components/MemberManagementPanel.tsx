import {
  Ban,
  Check,
  RotateCcw,
  Search,
  ShieldCheck,
  UserCheck,
  UserRoundCog,
  UserX,
  UsersRound,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  listCommunityMembers,
  type ManagedCommunityMember,
  updateCommunityMember,
  type UpdateCommunityMemberInput,
} from '../api/managerMembers'
import { ClientApiError } from '../api/client'
import { describeApiError } from '../api/errorPresentation'
import type { CommunityRole, CommunityTag } from '../domain/types'
import { DataStateView } from './DataStateView'
import { ManagerOtpLogin } from './ManagerOtpLogin'

type MemberFilter = 'all' | ManagedCommunityMember['status']

type MemberManagementPanelProps = {
  communityId: string
  tags: CommunityTag[]
}

type SensitiveMemberAction = {
  confirmLabel: string
  input: UpdateCommunityMemberInput
  memberId: string
  message: string
}

const roleLabels: Record<CommunityRole, string> = {
  player: 'Jugador',
  moderator: 'Moderador',
  manager: 'Gerente',
}

const statusLabels: Record<ManagedCommunityMember['status'], string> = {
  approved: 'Activo',
  pending: 'Pendiente',
  suspended: 'Suspendido',
}

const statusOrder: Record<ManagedCommunityMember['status'], number> = {
  pending: 0,
  approved: 1,
  suspended: 2,
}

function getMemberActionError(error: unknown) {
  if (error instanceof ClientApiError) {
    if (error.code === 'current_manager_protected') {
      return 'No puedes retirar el acceso de gerente de tu propia cuenta.'
    }

    if (error.code === 'last_manager_protected') {
      return 'La comunidad debe conservar al menos un gerente activo.'
    }
  }

  return 'No se ha podido guardar el cambio. Comprueba tu acceso e inténtalo de nuevo.'
}

export function MemberManagementPanel({
  communityId,
  tags,
}: MemberManagementPanelProps) {
  const [members, setMembers] = useState<ManagedCommunityMember[]>([])
  const [currentMemberId, setCurrentMemberId] = useState('')
  const [loadStatus, setLoadStatus] = useState<'error' | 'loading' | 'success'>(
    'loading',
  )
  const [loadError, setLoadError] = useState<unknown>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<MemberFilter>('all')
  const [showAll, setShowAll] = useState(false)
  const [pendingRejectId, setPendingRejectId] = useState<string>()
  const [sensitiveAction, setSensitiveAction] =
    useState<SensitiveMemberAction>()
  const [savingMemberId, setSavingMemberId] = useState<string>()
  const [actionError, setActionError] = useState('')
  const activeTags = tags.filter(({ isActive }) => isActive !== false)

  useEffect(() => {
    const controller = new AbortController()
    let isActive = true

    void listCommunityMembers(communityId, controller.signal)
      .then((result) => {
        if (!isActive) {
          return
        }

        setCurrentMemberId(result.currentMemberId)
        setMembers(result.members)
        setLoadStatus('success')
      })
      .catch((error: unknown) => {
        if (
          !isActive ||
          (error instanceof DOMException && error.name === 'AbortError')
        ) {
          return
        }

        setLoadError(error)
        setLoadStatus('error')
      })

    return () => {
      isActive = false
      controller.abort()
    }
  }, [communityId, reloadKey])

  const retryLoad = () => {
    setLoadStatus('loading')
    setReloadKey((key) => key + 1)
  }

  const memberCounts = {
    all: members.length,
    approved: members.filter(({ status }) => status === 'approved').length,
    pending: members.filter(({ status }) => status === 'pending').length,
    suspended: members.filter(({ status }) => status === 'suspended').length,
  }
  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es')

    return [...members]
      .filter((member) => filter === 'all' || member.status === filter)
      .filter((member) => {
        if (!normalizedQuery) {
          return true
        }

        const tagNames = member.tagIds.flatMap((tagId) => {
          const tag = tags.find(({ id }) => id === tagId)
          return tag ? [tag.name] : []
        })

        return [
          member.displayName,
          member.email,
          roleLabels[member.role],
          statusLabels[member.status],
          ...tagNames,
        ]
          .join(' ')
          .toLocaleLowerCase('es')
          .includes(normalizedQuery)
      })
      .sort(
        (first, second) =>
          statusOrder[first.status] - statusOrder[second.status] ||
          first.displayName.localeCompare(second.displayName, 'es'),
      )
  }, [filter, members, query, tags])
  const visibleMembers =
    showAll || query.trim() || filter !== 'all'
      ? filteredMembers
      : filteredMembers.slice(0, 15)

  const saveMember = async (
    memberId: string,
    input: UpdateCommunityMemberInput,
  ) => {
    setActionError('')
    setSavingMemberId(memberId)

    try {
      const { member } = await updateCommunityMember(
        communityId,
        memberId,
        input,
      )
      setMembers((currentMembers) =>
        currentMembers.map((currentMember) =>
          currentMember.id === member.id ? member : currentMember,
        ),
      )
    } catch (error) {
      const { kind } = describeApiError(error)

      if (kind === 'session_expired' || kind === 'access_denied') {
        setLoadError(error)
        setLoadStatus('error')
      } else {
        setActionError(getMemberActionError(error))
      }
    } finally {
      setSavingMemberId(undefined)
    }
  }

  const requestRoleChange = (
    member: ManagedCommunityMember,
    role: CommunityRole,
  ) => {
    if (role === member.role) {
      return
    }

    if (role === 'manager') {
      setSensitiveAction({
        confirmLabel: 'Confirmar promoción',
        input: { role },
        memberId: member.id,
        message: `¿Dar permisos de gerente a ${member.displayName}? Tendrá acceso a toda la configuración.`,
      })
      return
    }

    if (member.role === 'manager') {
      setSensitiveAction({
        confirmLabel: 'Confirmar cambio de rol',
        input: { role },
        memberId: member.id,
        message: `¿Retirar los permisos de gerente de ${member.displayName}?`,
      })
      return
    }

    void saveMember(member.id, { role })
  }

  const loadErrorKind =
    loadStatus === 'error' ? describeApiError(loadError).kind : null
  const requiresReauthentication =
    loadErrorKind === 'session_expired' || loadErrorKind === 'access_denied'

  return (
    <section
      className="member-management-panel"
      aria-labelledby="member-management-title"
    >
      <div className="configuration-panel-heading">
        <span aria-hidden="true">
          <UsersRound size={20} />
        </span>
        <div>
          <span>Acceso a la comunidad</span>
          <h2 id="member-management-title">Miembros y permisos</h2>
          <p>
            Consulta las altas reales de la comunidad, sus roles, estados y
            etiquetas.
          </p>
        </div>
      </div>

      {loadStatus === 'loading' ? (
        <DataStateView
          status="loading"
          loadingTitle="Cargando miembros…"
          loadingDescription="Consultando los perfiles de la comunidad."
        />
      ) : requiresReauthentication ? (
        <ManagerOtpLogin
          kind={loadErrorKind as 'access_denied' | 'session_expired'}
          onAuthenticated={retryLoad}
        />
      ) : loadStatus === 'error' ? (
        <DataStateView
          status="error"
          loadingTitle="Cargando miembros…"
          error={loadError}
          onRetry={retryLoad}
        />
      ) : (
        <>
          <div className="member-management-toolbar">
            <label className="member-search">
              <Search aria-hidden="true" size={18} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre, correo, rol o etiqueta"
                aria-label="Buscar miembros"
              />
            </label>

            <div
              className="member-status-filters"
              role="group"
              aria-label="Filtrar miembros por estado"
            >
              {(
                [
                  ['all', 'Todos'],
                  ['pending', 'Pendientes'],
                  ['approved', 'Activos'],
                  ['suspended', 'Suspendidos'],
                ] as const
              ).map(([status, label]) => (
                <button
                  type="button"
                  aria-pressed={filter === status}
                  key={status}
                  onClick={() => {
                    setFilter(status)
                    setShowAll(false)
                  }}
                >
                  {label}
                  <span>{memberCounts[status]}</span>
                </button>
              ))}
            </div>
          </div>

          {actionError ? (
            <div className="member-management-action-error" role="alert">
              {actionError}
            </div>
          ) : null}

          <div className="managed-member-list">
            {visibleMembers.map((member) => {
              const isCurrentManager = member.id === currentMemberId
              const selectedTags = activeTags.filter((tag) =>
                member.tagIds.includes(tag.id),
              )
              const isSaving = savingMemberId === member.id

              return (
                <article
                  className="managed-member-row"
                  data-status={member.status}
                  key={member.id}
                >
                  <div className="managed-member-row__identity">
                    <strong>{member.displayName}</strong>
                    <span title={member.email}>
                      {member.email} · {statusLabels[member.status]}
                      {isCurrentManager ? ' · Tu cuenta' : ''}
                    </span>
                  </div>

                  {member.status === 'pending' ? (
                    <div className="managed-member-row__approval-actions">
                      <button
                        className="member-action member-action--approve"
                        type="button"
                        disabled={isSaving}
                        onClick={() =>
                          void saveMember(member.id, { status: 'approved' })
                        }
                      >
                        <UserCheck aria-hidden="true" size={16} />
                        Aceptar
                      </button>
                      {pendingRejectId === member.id ? (
                        <div className="member-reject-confirmation">
                          <span>¿Rechazar solicitud?</span>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => {
                              void saveMember(member.id, {
                                status: 'suspended',
                              })
                              setPendingRejectId(undefined)
                            }}
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => setPendingRejectId(undefined)}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          className="member-action member-action--reject"
                          type="button"
                          disabled={isSaving}
                          onClick={() => setPendingRejectId(member.id)}
                        >
                          <UserX aria-hidden="true" size={16} />
                          Rechazar
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <label className="managed-member-role">
                        <span>Rol</span>
                        <select
                          aria-label={`Rol de ${member.displayName}`}
                          value={member.role}
                          disabled={isCurrentManager || isSaving}
                          onChange={(event) =>
                            requestRoleChange(
                              member,
                              event.target.value as CommunityRole,
                            )
                          }
                        >
                          <option value="player">Jugador</option>
                          <option value="moderator">Moderador</option>
                          <option value="manager">Gerente</option>
                        </select>
                      </label>

                      <details className="managed-member-tags">
                        <summary>
                          Etiquetas <span>{selectedTags.length}</span>
                        </summary>
                        <div>
                          {activeTags.map((tag) => (
                            <label key={tag.id}>
                              <input
                                type="checkbox"
                                checked={member.tagIds.includes(tag.id)}
                                disabled={isSaving}
                                onChange={() => {
                                  const nextTagIds = member.tagIds.includes(
                                    tag.id,
                                  )
                                    ? member.tagIds.filter(
                                        (tagId) => tagId !== tag.id,
                                      )
                                    : [...member.tagIds, tag.id]

                                  void saveMember(member.id, {
                                    tagIds: nextTagIds,
                                  })
                                }}
                              />
                              <span>{tag.name}</span>
                            </label>
                          ))}
                        </div>
                      </details>

                      {member.status === 'suspended' ? (
                        <button
                          className="member-action member-action--restore"
                          type="button"
                          disabled={isSaving}
                          aria-label={`Reactivar a ${member.displayName}`}
                          onClick={() =>
                            void saveMember(member.id, { status: 'approved' })
                          }
                        >
                          <RotateCcw aria-hidden="true" size={16} />
                          <span>Reactivar</span>
                        </button>
                      ) : (
                        <button
                          className="member-action member-action--suspend"
                          type="button"
                          disabled={isCurrentManager || isSaving}
                          aria-label={`Suspender a ${member.displayName}`}
                          onClick={() =>
                            setSensitiveAction({
                              confirmLabel: 'Confirmar suspensión',
                              input: { status: 'suspended' },
                              memberId: member.id,
                              message: `¿Suspender a ${member.displayName}? Perderá el acceso a la comunidad hasta que se reactive su cuenta.`,
                            })
                          }
                        >
                          <Ban aria-hidden="true" size={16} />
                          <span>Suspender</span>
                        </button>
                      )}

                      {sensitiveAction?.memberId === member.id ? (
                        <div className="member-sensitive-confirmation">
                          <span>{sensitiveAction.message}</span>
                          <div>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => {
                                void saveMember(
                                  member.id,
                                  sensitiveAction.input,
                                )
                                setSensitiveAction(undefined)
                              }}
                            >
                              {sensitiveAction.confirmLabel}
                            </button>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => setSensitiveAction(undefined)}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </article>
              )
            })}
          </div>

          {filteredMembers.length === 0 ? (
            <div className="member-management-empty">
              <UserRoundCog aria-hidden="true" size={25} />
              <strong>No se han encontrado miembros.</strong>
              <span>Prueba otro nombre o estado.</span>
            </div>
          ) : null}

          {!showAll &&
          !query.trim() &&
          filter === 'all' &&
          filteredMembers.length > 15 ? (
            <button
              className="secondary-button member-show-all"
              type="button"
              onClick={() => setShowAll(true)}
            >
              Mostrar todos los miembros ({filteredMembers.length})
            </button>
          ) : null}

          <div
            className="member-permission-legend"
            aria-label="Permisos por rol"
          >
            <span>
              <Check aria-hidden="true" size={15} /> Jugador: participa
            </span>
            <span>
              <ShieldCheck aria-hidden="true" size={15} /> Moderador: valida y
              modera
            </span>
            <span>
              <UserRoundCog aria-hidden="true" size={15} /> Gerente:
              configuración completa
            </span>
          </div>
        </>
      )}
    </section>
  )
}
