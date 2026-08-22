import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  Link2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
import { useMemo, useState, type ChangeEvent, type DragEvent } from 'react'

import { parseEventLinkHtml } from '../data/eventLinkImport'
import {
  matchEventLinkMembers,
  saveEventLinkStanding,
} from '../data/eventStandingImport'
import type { DemoDataUpdater } from '../data/demoRepository'
import type {
  CommunityEvent,
  CommunityMember,
  DemoDataSet,
} from '../domain/types'

const MAX_EVENTLINK_FILE_SIZE = 5 * 1024 * 1024

type EventLinkImportPanelProps = {
  data: DemoDataSet
  event: CommunityEvent
  manager: CommunityMember
  onClose: () => void
  onDataChange: (updater: DemoDataUpdater) => void
  onImported: (message: string) => void
}

export function EventLinkImportPanel({
  data,
  event,
  manager,
  onClose,
  onDataChange,
  onImported,
}: EventLinkImportPanelProps) {
  const [fileName, setFileName] = useState('')
  const [parsedStanding, setParsedStanding] =
    useState<ReturnType<typeof parseEventLinkHtml>['standing']>()
  const [memberIdsByRow, setMemberIdsByRow] = useState<
    Array<string | undefined>
  >([])
  const [errors, setErrors] = useState<string[]>([])
  const [countsForRanking, setCountsForRanking] = useState(
    event.countsForCommunityRanking ?? true,
  )
  const approvedMembers = useMemo(
    () =>
      data.members
        .filter(({ status }) => status === 'approved')
        .sort((first, second) =>
          first.displayName.localeCompare(second.displayName, 'es'),
        ),
    [data.members],
  )
  const existingStanding = data.eventStandings.find(
    ({ eventId }) => eventId === event.id,
  )
  const registeredPlayerCount = event.registrationSummary.confirmed
  const linkedCount = memberIdsByRow.filter(Boolean).length
  const assignedMemberIds = new Set(memberIdsByRow.filter(Boolean))

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

    const matches = matchEventLinkMembers(result.standing.rows, data.members)
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

  const importStanding = () => {
    if (!parsedStanding) {
      return
    }

    onDataChange((currentData) =>
      saveEventLinkStanding(currentData, {
        eventId: event.id,
        managerId: manager.id,
        parsedStanding,
        memberIdsByRow,
        countsForCommunityRanking: countsForRanking,
      }),
    )
    onImported(
      existingStanding
        ? 'La clasificación EventLink se ha sustituido.'
        : 'La clasificación EventLink se ha importado.',
    )
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
          Guarda la página de posiciones desde EventLink y súbela aquí. El
          archivo se analiza localmente y sus scripts no se ejecutan.
        </p>
      </header>

      <label
        className="eventlink-dropzone"
        onDragOver={(dragEvent) => dragEvent.preventDefault()}
        onDrop={handleDrop}
      >
        <FileUp aria-hidden="true" size={24} />
        <strong>{fileName || 'Seleccionar archivo EventLink'}</strong>
        <span>HTML · máximo 5 MB</span>
        <input
          accept=".html,.htm,text/html"
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

      {parsedStanding ? (
        <>
          <div className="eventlink-import__summary">
            <div>
              <span>Evento detectado</span>
              <strong>{parsedStanding.eventTitle ?? 'Sin título'}</strong>
            </div>
            <div>
              <span>Ronda</span>
              <strong>{parsedStanding.roundNumber ?? '—'}</strong>
            </div>
            <div>
              <span>Jugadores</span>
              <strong>{parsedStanding.rows.length}</strong>
            </div>
            <div>
              <span>Vinculados</span>
              <strong>
                {linkedCount}/{parsedStanding.rows.length}
              </strong>
            </div>
          </div>

          {parsedStanding.warnings.length > 0 ||
          existingStanding ||
          (registeredPlayerCount > 0 &&
            registeredPlayerCount !== parsedStanding.rows.length) ? (
            <div className="eventlink-import__messages">
              <AlertTriangle aria-hidden="true" size={18} />
              <div>
                {parsedStanding.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
                {existingStanding ? (
                  <p>
                    Este evento ya tiene una clasificación. Al confirmar se
                    sustituirá por este archivo.
                  </p>
                ) : null}
                {registeredPlayerCount > 0 &&
                registeredPlayerCount !== parsedStanding.rows.length ? (
                  <p>
                    Garroveta tiene {registeredPlayerCount} inscripciones
                    confirmadas, pero el archivo contiene{' '}
                    {parsedStanding.rows.length} jugadores. Comprueba que has
                    seleccionado el evento correcto.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="eventlink-import__players">
            <div className="eventlink-import__section-heading">
              <div>
                <span>Correspondencias</span>
                <h4>Jugadores EventLink</h4>
              </div>
              <span>
                <Link2 aria-hidden="true" size={14} /> {linkedCount} vinculados
              </span>
            </div>
            <div className="eventlink-player-list">
              {parsedStanding.rows.map((row, rowIndex) => {
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

          <div className="eventlink-import__actions">
            <button type="button" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={importStanding}
            >
              <UsersRound aria-hidden="true" size={17} />
              {existingStanding
                ? 'Sustituir clasificación'
                : 'Importar clasificación'}
            </button>
          </div>
        </>
      ) : null}
    </section>
  )
}
