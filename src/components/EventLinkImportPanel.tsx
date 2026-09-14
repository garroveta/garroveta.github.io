import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  Link2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'

import type { EventStandingWriteInput } from '../api/eventStandings'
import {
  listCommunityMembers,
  type ManagedCommunityMember,
} from '../api/managerMembers'
import type { EventLinkStandingRow } from '../data/eventLinkImport'
import { parseEventLinkHtml } from '../data/eventLinkImport'
import { matchEventLinkMembers } from '../data/eventStandingImport'
import type {
  CommunityEvent,
  DemoDataSet,
  EventStanding,
} from '../domain/types'

const MAX_EVENTLINK_FILE_SIZE = 5 * 1024 * 1024

type EventLinkImportPanelProps = {
  data: DemoDataSet
  event: CommunityEvent
  onClose: () => void
  onImported: (message: string, standingId: string) => void
  onSaveStanding: (
    eventId: string,
    input: EventStandingWriteInput,
  ) => Promise<EventStanding>
}

export function EventLinkImportPanel({
  data,
  event,
  onClose,
  onImported,
  onSaveStanding,
}: EventLinkImportPanelProps) {
  // EventLink drops its results after a few days, so a wrong link found later
  // can never be fixed by re-importing: the saved standing is the only copy
  // left, and it seeds this panel when no new file is loaded.
  const existingStanding = data.eventStandings.find(
    ({ eventId }) => eventId === event.id,
  )
  const [fileName, setFileName] = useState('')
  const [parsedStanding, setParsedStanding] =
    useState<ReturnType<typeof parseEventLinkHtml>['standing']>()
  const [memberIdsByRow, setMemberIdsByRow] = useState<
    Array<string | undefined>
  >(() => existingStanding?.entries.map(({ memberId }) => memberId) ?? [])
  const [errors, setErrors] = useState<string[]>([])
  const [countsForRanking, setCountsForRanking] = useState(
    event.countsForCommunityRanking ?? true,
  )
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [members, setMembers] = useState<ManagedCommunityMember[]>([])
  const [membersStatus, setMembersStatus] = useState<
    'error' | 'loading' | 'ready'
  >('loading')

  useEffect(() => {
    const controller = new AbortController()

    listCommunityMembers(data.community.id, controller.signal)
      .then((result) => {
        setMembers(result.members)
        setMembersStatus('ready')
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setMembersStatus('error')
          console.error('No se ha podido cargar la lista de miembros', error)
        }
      })

    return () => controller.abort()
  }, [data.community.id])

  const approvedMembers = useMemo(
    () =>
      members
        .filter(({ status }) => status === 'approved')
        .sort((first, second) =>
          first.displayName.localeCompare(second.displayName, 'es'),
        ),
    [members],
  )
  const hasCompetitionMetadata = Boolean(
    data.competitionFormats.some(
      ({ id, gameId }) => id === event.formatId && gameId === event.gameId,
    ),
  )
  // A saved entry is an EventLink row plus its member, and the save overrides
  // that member anyway, so the entries can be reviewed as rows directly.
  const reviewRows: EventLinkStandingRow[] | undefined =
    parsedStanding?.rows ?? existingStanding?.entries
  /** No new file: the manager is here to correct links, not to replace. */
  const isCorrecting = !parsedStanding && Boolean(existingStanding)
  const frozenSeason = data.rankingSeasons.find(
    ({ id, status }) =>
      id === existingStanding?.rankingSeasonId && status === 'closed',
  )
  const linkedCount = memberIdsByRow.filter(Boolean).length
  const assignedMemberIds = new Set(memberIdsByRow.filter(Boolean))
  const canImport =
    hasCompetitionMetadata && membersStatus === 'ready' && !frozenSeason

  const readFile = async (file?: File) => {
    setErrors([])
    setParsedStanding(undefined)
    setMemberIdsByRow([])

    if (!file) {
      return
    }

    if (!/\.html?$/i.test(file.name)) {
      setErrors(['Selecciona una página EventLink en formato HTML.'])
      return
    }

    if (file.size > MAX_EVENTLINK_FILE_SIZE) {
      setErrors(['El archivo supera el límite de 5 MB.'])
      return
    }

    const result = parseEventLinkHtml(await file.text())
    setFileName(file.name)
    setErrors(result.errors)

    if (!result.standing) {
      return
    }

    const matches = matchEventLinkMembers(result.standing.rows, members)
    setParsedStanding(result.standing)
    setMemberIdsByRow(matches.map(({ memberId }) => memberId))
  }

  const handleFileChange = (changeEvent: ChangeEvent<HTMLInputElement>) => {
    void readFile(changeEvent.target.files?.[0])
    changeEvent.target.value = ''
  }

  const handleDrop = (dropEvent: DragEvent<HTMLLabelElement>) => {
    dropEvent.preventDefault()
    void readFile(dropEvent.dataTransfer.files[0])
  }

  const importStanding = async () => {
    if (!reviewRows || !canImport) {
      return
    }

    setSaveError('')
    setIsSaving(true)

    try {
      const standing = await onSaveStanding(event.id, {
        countsForCommunityRanking: countsForRanking,
        entries: reviewRows.map((row, index) => ({
          ...row,
          memberId: memberIdsByRow[index],
        })),
        // Correcting keeps whatever the original import recorded.
        source: parsedStanding
          ? {
              externalEventId: parsedStanding.externalEventId,
              roundNumber: parsedStanding.roundNumber,
              storeId: parsedStanding.storeId,
            }
          : {
              externalEventId: existingStanding?.source?.externalEventId,
              roundNumber: existingStanding?.source?.roundNumber,
              storeId: existingStanding?.source?.storeId,
            },
      })
      onImported(
        isCorrecting
          ? 'Los vínculos de la clasificación se han actualizado.'
          : existingStanding
            ? 'La clasificación EventLink se ha sustituido.'
            : 'La clasificación EventLink se ha importado.',
        standing.id,
      )
    } catch {
      setSaveError(
        'No se ha podido guardar la clasificación. Inténtalo de nuevo.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section
      className="eventlink-import"
      aria-labelledby="eventlink-import-title"
    >
      <button
        className="manager-participant-panel__close"
        type="button"
        onClick={onClose}
      >
        <X aria-hidden="true" size={16} />
        Cerrar
      </button>
      <header className="eventlink-import__heading">
        <span>Resultados del torneo</span>
        <h3 id="eventlink-import-title">{event.title}</h3>
        <p>
          {isCorrecting
            ? 'Corrige aquí a qué miembro corresponde cada jugador. Sube un archivo solo si quieres sustituir la clasificación entera.'
            : 'Guarda la página de posiciones desde EventLink y súbela aquí. El archivo se analiza localmente y sus scripts no se ejecutan.'}
        </p>
      </header>

      {!hasCompetitionMetadata ? (
        <div className="eventlink-import__messages eventlink-import__messages--error">
          <AlertTriangle aria-hidden="true" size={18} />
          <p>
            Modifica primero el evento para indicar su formato MTG. Este dato es
            necesario para mostrar el resultado y actualizar el ranking.
          </p>
        </div>
      ) : null}

      {frozenSeason ? (
        <div className="eventlink-import__messages eventlink-import__messages--error">
          <AlertTriangle aria-hidden="true" size={18} />
          <p>
            La temporada «{frozenSeason.name}» está cerrada, así que su
            clasificación ya no se puede modificar.
          </p>
        </div>
      ) : null}

      {membersStatus === 'error' ? (
        <div className="eventlink-import__messages eventlink-import__messages--error">
          <AlertTriangle aria-hidden="true" size={18} />
          <p>
            No se ha podido cargar la lista de miembros. Cierra e inténtalo de
            nuevo.
          </p>
        </div>
      ) : null}

      <label
        className="eventlink-dropzone"
        onDragOver={(dragEvent) => dragEvent.preventDefault()}
        onDrop={handleDrop}
      >
        <FileUp aria-hidden="true" size={24} />
        <strong>
          {membersStatus === 'loading'
            ? 'Cargando miembros…'
            : fileName || 'Seleccionar archivo EventLink'}
        </strong>
        <span>HTML · máximo 5 MB</span>
        <input
          accept=".html,.htm,text/html"
          disabled={!canImport}
          type="file"
          onChange={handleFileChange}
        />
      </label>

      {errors.length > 0 ? (
        <div className="eventlink-import__messages eventlink-import__messages--error">
          <AlertTriangle aria-hidden="true" size={18} />
          <div>
            {errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        </div>
      ) : null}

      {reviewRows ? (
        <>
          <div className="eventlink-import__summary">
            {parsedStanding ? (
              <>
                <div>
                  <span>Evento detectado</span>
                  <strong>{parsedStanding.eventTitle ?? 'Sin título'}</strong>
                </div>
                <div>
                  <span>Ronda</span>
                  <strong>{parsedStanding.roundNumber ?? '—'}</strong>
                </div>
              </>
            ) : null}
            <div>
              <span>Jugadores</span>
              <strong>{reviewRows.length}</strong>
            </div>
            <div>
              <span>Vinculados</span>
              <strong>
                {linkedCount}/{reviewRows.length}
              </strong>
            </div>
          </div>

          {(parsedStanding?.warnings.length ?? 0) > 0 ||
          (parsedStanding && existingStanding) ? (
            <div className="eventlink-import__messages">
              <AlertTriangle aria-hidden="true" size={18} />
              <div>
                {parsedStanding?.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
                {existingStanding ? (
                  <p>
                    Este evento ya tiene una clasificación. Al confirmar se
                    sustituirá por este archivo.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="eventlink-import__players">
            <div className="eventlink-import__section-heading">
              <div>
                <span>Correspondencias</span>
                <h4>
                  {isCorrecting
                    ? 'Jugadores del torneo'
                    : 'Jugadores EventLink'}
                </h4>
              </div>
              <span>
                <Link2 aria-hidden="true" size={14} /> {linkedCount} vinculados
              </span>
            </div>
            <div className="eventlink-player-list">
              {reviewRows.map((row, rowIndex) => {
                const selectedMemberId = memberIdsByRow[rowIndex] ?? ''

                return (
                  <article
                    className="eventlink-player-row"
                    key={`${row.rank}-${row.displayName}-${rowIndex}`}
                  >
                    <span className="eventlink-player-row__rank">
                      {row.rank}
                    </span>
                    <div className="eventlink-player-row__identity">
                      <strong>{row.displayName}</strong>
                      <span>
                        {row.eventPoints} pts · {row.wins}/{row.losses}/
                        {row.draws}
                      </span>
                      <details>
                        <summary>Desempates</summary>
                        <span>
                          %VPO {row.opponentMatchWinPercentage.toFixed(1)} · %JG{' '}
                          {row.gameWinPercentage.toFixed(1)} · %JGO{' '}
                          {row.opponentGameWinPercentage.toFixed(1)}
                        </span>
                      </details>
                    </div>
                    <label className="eventlink-player-row__member">
                      <span>
                        {selectedMemberId ? (
                          <CheckCircle2 aria-hidden="true" size={13} />
                        ) : (
                          <UserRound aria-hidden="true" size={13} />
                        )}
                        {selectedMemberId ? 'Vinculado' : 'Sin vincular'}
                      </span>
                      <select
                        aria-label={`Miembro Garroveta para ${row.displayName}`}
                        value={selectedMemberId}
                        onChange={(changeEvent) => {
                          const nextMemberId =
                            changeEvent.target.value || undefined
                          setMemberIdsByRow((current) =>
                            current.map((memberId, index) =>
                              index === rowIndex ? nextMemberId : memberId,
                            ),
                          )
                        }}
                      >
                        <option value="">Invitado sin vincular</option>
                        {approvedMembers.map((member) => (
                          <option
                            disabled={
                              assignedMemberIds.has(member.id) &&
                              member.id !== selectedMemberId
                            }
                            key={member.id}
                            value={member.id}
                          >
                            {member.displayName}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                )
              })}
            </div>
          </div>

          <label className="eventlink-ranking-option">
            <input
              checked={countsForRanking}
              type="checkbox"
              onChange={(changeEvent) =>
                setCountsForRanking(changeEvent.target.checked)
              }
            />
            <span>
              <strong>Cuenta para el ranking comunitario</strong>
              Solo los miembros vinculados recibirán puntos Garroveta.
            </span>
          </label>

          {saveError ? (
            <p className="registration-error" role="alert">
              {saveError}
            </p>
          ) : null}

          <div className="eventlink-import__actions">
            <button type="button" disabled={isSaving} onClick={onClose}>
              Cancelar
            </button>
            <button
              className="primary-button"
              disabled={!canImport || isSaving}
              type="button"
              onClick={() => void importStanding()}
            >
              <UsersRound aria-hidden="true" size={17} />
              {isSaving
                ? 'Guardando…'
                : isCorrecting
                  ? 'Guardar los vínculos'
                  : existingStanding
                    ? 'Sustituir clasificación'
                    : 'Importar clasificación'}
            </button>
          </div>
        </>
      ) : null}
    </section>
  )
}
