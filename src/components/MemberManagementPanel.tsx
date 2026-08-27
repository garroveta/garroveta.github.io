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
import { useMemo, useState } from 'react'

import type { DemoDataUpdater } from '../data/demoRepository'
import {
  approveMember,
  rejectPendingMember,
  setMemberSuspended,
  updateMemberRole,
  updateMemberTags,
} from '../data/memberManagement'
import type {
  CommunityMember,
  CommunityRole,
  DemoDataSet,
} from '../domain/types'

type MemberFilter = 'all' | CommunityMember['status']

type MemberManagementPanelProps = {
  data: DemoDataSet
  managerId: string
  onDataChange: (updater: DemoDataUpdater) => void
}

const roleLabels: Record<CommunityRole, string> = {
  player: 'Jugador',
  moderator: 'Moderador',
  manager: 'Gerente',
}

const statusLabels: Record<CommunityMember['status'], string> = {
  approved: 'Activo',
  pending: 'Pendiente',
  suspended: 'Suspendido',
}

const statusOrder: Record<CommunityMember['status'], number> = {
  pending: 0,
  approved: 1,
  suspended: 2,
}

export function MemberManagementPanel({
  data,
  managerId,
  onDataChange,
}: MemberManagementPanelProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<MemberFilter>('all')
  const [showAll, setShowAll] = useState(false)
  const [pendingRejectId, setPendingRejectId] = useState<string>()
  const activeTags = data.tags.filter(({ isActive }) => isActive !== false)
  const memberCounts = {
    all: data.members.length,
    approved: data.members.filter(({ status }) => status === 'approved').length,
    pending: data.members.filter(({ status }) => status === 'pending').length,
    suspended: data.members.filter(({ status }) => status === 'suspended')
      .length,
  }
  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('es')

    return [...data.members]
      .filter((member) => filter === 'all' || member.status === filter)
      .filter((member) => {
        if (!normalizedQuery) {
          return true
        }

        const tagNames = member.tagIds.flatMap((tagId) => {
          const tag = data.tags.find(({ id }) => id === tagId)
          return tag ? [tag.name] : []
        })

        return [
          member.displayName,
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
  }, [data.members, data.tags, filter, query])
  const visibleMembers =
    showAll || query.trim() || filter !== 'all'
      ? filteredMembers
      : filteredMembers.slice(0, 15)

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
            Valida las solicitudes, asigna responsabilidades y administra las
            etiquetas de cada perfil.
          </p>
        </div>
      </div>

      <div className="member-management-toolbar">
        <label className="member-search">
          <Search aria-hidden="true" size={18} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, rol o etiqueta"
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

      <div className="managed-member-list">
        {visibleMembers.map((member) => {
          const isCurrentManager = member.id === managerId
          const selectedTags = new Set(member.tagIds)

          return (
            <article
              className="managed-member-row"
              data-status={member.status}
              key={member.id}
            >
              <span className="managed-member-row__avatar" aria-hidden="true">
                {member.initials}
              </span>

              <div className="managed-member-row__identity">
                <strong>{member.displayName}</strong>
                <span>
                  {roleLabels[member.role]} · {statusLabels[member.status]}
                  {isCurrentManager ? ' · Tu cuenta' : ''}
                </span>
              </div>

              {member.status === 'pending' ? (
                <div className="managed-member-row__approval-actions">
                  <button
                    className="member-action member-action--approve"
                    type="button"
                    onClick={() =>
                      onDataChange((currentData) =>
                        approveMember(currentData, member.id, managerId),
                      )
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
                        onClick={() => {
                          onDataChange((currentData) =>
                            rejectPendingMember(
                              currentData,
                              member.id,
                              managerId,
                            ),
                          )
                          setPendingRejectId(undefined)
                        }}
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingRejectId(undefined)}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      className="member-action member-action--reject"
                      type="button"
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
                      disabled={isCurrentManager}
                      onChange={(event) =>
                        onDataChange((currentData) =>
                          updateMemberRole(
                            currentData,
                            member.id,
                            managerId,
                            event.target.value as CommunityRole,
                          ),
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
                      Etiquetas <span>{member.tagIds.length}</span>
                    </summary>
                    <div>
                      {activeTags.map((tag) => (
                        <label key={tag.id}>
                          <input
                            type="checkbox"
                            checked={selectedTags.has(tag.id)}
                            onChange={() => {
                              const nextTagIds = selectedTags.has(tag.id)
                                ? member.tagIds.filter(
                                    (tagId) => tagId !== tag.id,
                                  )
                                : [...member.tagIds, tag.id]

                              onDataChange((currentData) =>
                                updateMemberTags(
                                  currentData,
                                  member.id,
                                  managerId,
                                  nextTagIds,
                                ),
                              )
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
                      onClick={() =>
                        onDataChange((currentData) =>
                          setMemberSuspended(
                            currentData,
                            member.id,
                            managerId,
                            false,
                          ),
                        )
                      }
                    >
                      <RotateCcw aria-hidden="true" size={16} />
                      Reactivar
                    </button>
                  ) : (
                    <button
                      className="member-action member-action--suspend"
                      type="button"
                      disabled={isCurrentManager}
                      onClick={() =>
                        onDataChange((currentData) =>
                          setMemberSuspended(
                            currentData,
                            member.id,
                            managerId,
                            true,
                          ),
                        )
                      }
                    >
                      <Ban aria-hidden="true" size={16} />
                      Suspender
                    </button>
                  )}
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

      <div className="member-permission-legend" aria-label="Permisos por rol">
        <span>
          <Check aria-hidden="true" size={15} /> Jugador: participa
        </span>
        <span>
          <ShieldCheck aria-hidden="true" size={15} /> Moderador: valida y
          modera
        </span>
        <span>
          <UserRoundCog aria-hidden="true" size={15} /> Gerente: configuración
          completa
        </span>
      </div>
    </section>
  )
}
