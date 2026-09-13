import { Save, Settings2, Trophy } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { describeApiError } from '../api/errorPresentation'
import type {
  RankingSeasonUpdateInput,
  RankingSeasonWriteInput,
} from '../api/rankingSeasons'
import type { DemoDataUpdater } from '../data/demoRepository'
import type { RankingSeasonsStatus } from '../hooks/useRankingSeasons'
import type { CommunityRankingPoints, DemoDataSet } from '../domain/types'
import { DataStateView } from './DataStateView'
import { QuantityField } from './QuantityField'
import { ManagerOtpLogin } from './ManagerOtpLogin'

type RankingSettingsPanelProps = {
  data: DemoDataSet
  onActivateSeason: (seasonId: string) => Promise<void>
  onCloseSeason: (seasonId: string) => Promise<void>
  onCreateSeason: (input: RankingSeasonWriteInput) => Promise<void>
  onDataChange: (updater: DemoDataUpdater) => void
  onDeleteSeason: (seasonId: string) => Promise<void>
  onReloadSeasons: () => void
  onUpdateSeason: (
    seasonId: string,
    input: RankingSeasonUpdateInput,
  ) => Promise<void>
  seasonsError: unknown
  seasonsStatus: RankingSeasonsStatus
}

const pointFields = [
  ['first', '1.º'],
  ['second', '2.º'],
  ['third', '3.º'],
  ['fourth', '4.º'],
  ['fifth', '5.º'],
  ['sixthToTenth', '6.º–10.º'],
  ['participation', 'Participación'],
] as const

const seasonStatusLabels = {
  upcoming: 'Programada',
  active: 'Activa',
  closed: 'Cerrada',
}

const emptyPoints: CommunityRankingPoints = {
  first: 10,
  second: 8,
  third: 6,
  fourth: 5,
  fifth: 4,
  sixthToTenth: 3,
  participation: 1,
}

function isPointsValid(points: CommunityRankingPoints) {
  const values = pointFields.map(([field]) => points[field])

  return (
    values.every(
      (value) => Number.isInteger(value) && value >= 0 && value <= 100,
    ) &&
    values.every((value, index) => index === 0 || values[index - 1]! >= value)
  )
}

function RankingPointsFields({
  idPrefix,
  points,
  onChange,
}: {
  idPrefix: string
  points: CommunityRankingPoints
  onChange: (points: CommunityRankingPoints) => void
}) {
  return (
    <div className="ranking-settings-points">
      {pointFields.map(([field, label]) => (
        <label className="form-field" key={field}>
          <span>{label}</span>
          <QuantityField
            ariaLabel={`${idPrefix}: puntos para ${label}`}
            max={100}
            min={0}
            required
            value={points[field]}
            onChange={(value) => onChange({ ...points, [field]: value })}
          />
        </label>
      ))}
    </div>
  )
}

export function RankingSettingsPanel({
  data,
  onActivateSeason,
  onCloseSeason,
  onCreateSeason,
  onDataChange,
  onDeleteSeason,
  onReloadSeasons,
  onUpdateSeason,
  seasonsError,
  seasonsStatus,
}: RankingSettingsPanelProps) {
  const activeSeason = data.rankingSeasons.find(
    ({ status }) => status === 'active',
  )
  const upcomingSeasons = data.rankingSeasons.filter(
    ({ status }) => status === 'upcoming',
  )
  const seasons = [...data.rankingSeasons].sort((first, second) =>
    second.startsOn.localeCompare(first.startsOn),
  )
  const [defaultLimit, setDefaultLimit] = useState(
    data.rankingSettings.defaultLimit,
  )
  const [points, setPoints] = useState(activeSeason?.points ?? emptyPoints)
  const [saveStatus, setSaveStatus] = useState<
    'error' | 'idle' | 'invalid' | 'saved' | 'saving'
  >('idle')
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [newSeason, setNewSeason] = useState<RankingSeasonWriteInput>({
    name: '',
    startsOn: '',
    endsOn: '',
    points: activeSeason?.points ?? emptyPoints,
  })
  const [createError, setCreateError] = useState('')
  const [pendingCloseSeasonId, setPendingCloseSeasonId] = useState<string>()
  const [pendingDeleteSeasonId, setPendingDeleteSeasonId] = useState<string>()
  const [editingDates, setEditingDates] = useState<{
    seasonId: string
    startsOn: string
    endsOn: string
  }>()
  const [pendingActionSeasonId, setPendingActionSeasonId] = useState<string>()
  const [actionError, setActionError] = useState('')
  const [requiresReauthentication, setRequiresReauthentication] = useState<
    'access_denied' | 'session_expired'
  >()

  function handleActionError(error: unknown, fallbackMessage: string) {
    const presentation = describeApiError(error)

    if (
      presentation.kind === 'session_expired' ||
      presentation.kind === 'access_denied'
    ) {
      setRequiresReauthentication(presentation.kind)
      return
    }

    setActionError(fallbackMessage)
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isPointsValid(points)) {
      setSaveStatus('invalid')
      return
    }

    setSaveStatus('saving')

    try {
      if (activeSeason) {
        await onUpdateSeason(activeSeason.id, { points })
      }

      onDataChange((currentData) => ({
        ...currentData,
        rankingSettings: { ...currentData.rankingSettings, defaultLimit },
      }))
      setSaveStatus('saved')
    } catch (error) {
      const presentation = describeApiError(error)

      if (
        presentation.kind === 'session_expired' ||
        presentation.kind === 'access_denied'
      ) {
        setRequiresReauthentication(presentation.kind)
        return
      }

      setSaveStatus('error')
    }
  }

  async function createSeason(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreateError('')

    if (!isPointsValid(newSeason.points)) {
      setCreateError(
        'Revisa el nombre, las fechas y los puntos de la temporada.',
      )
      return
    }

    setPendingActionSeasonId('__new__')

    try {
      await onCreateSeason(newSeason)
      setNewSeason({
        name: '',
        startsOn: '',
        endsOn: '',
        points: activeSeason?.points ?? emptyPoints,
      })
      setIsCreateFormOpen(false)
    } catch (error) {
      const presentation = describeApiError(error)

      if (
        presentation.kind === 'session_expired' ||
        presentation.kind === 'access_denied'
      ) {
        setRequiresReauthentication(presentation.kind)
        return
      }

      setCreateError(
        presentation.kind === 'network'
          ? presentation.description
          : 'Las fechas se solapan con otra temporada existente.',
      )
    } finally {
      setPendingActionSeasonId(undefined)
    }
  }

  async function closeSeason(seasonId: string) {
    const nextSeasonId =
      upcomingSeasons.length === 1 ? upcomingSeasons[0]!.id : undefined

    setActionError('')
    setPendingActionSeasonId(seasonId)

    try {
      await onCloseSeason(seasonId)

      if (nextSeasonId) {
        await onActivateSeason(nextSeasonId)
      }

      setPendingCloseSeasonId(undefined)
    } catch (error) {
      handleActionError(
        error,
        'No se ha podido cerrar la temporada. Inténtalo de nuevo.',
      )
    } finally {
      setPendingActionSeasonId(undefined)
    }
  }

  async function activateSeason(seasonId: string) {
    setActionError('')
    setPendingActionSeasonId(seasonId)

    try {
      await onActivateSeason(seasonId)
    } catch (error) {
      handleActionError(
        error,
        'No se ha podido activar la temporada. Inténtalo de nuevo.',
      )
    } finally {
      setPendingActionSeasonId(undefined)
    }
  }

  async function saveDates() {
    if (!editingDates || editingDates.startsOn > editingDates.endsOn) {
      setActionError('La fecha de inicio no puede ser posterior a la de fin.')
      return
    }

    setActionError('')
    setPendingActionSeasonId(editingDates.seasonId)

    try {
      await onUpdateSeason(editingDates.seasonId, {
        startsOn: editingDates.startsOn,
        endsOn: editingDates.endsOn,
      })
      setEditingDates(undefined)
    } catch (error) {
      const presentation = describeApiError(error)

      if (
        presentation.kind === 'session_expired' ||
        presentation.kind === 'access_denied'
      ) {
        setRequiresReauthentication(presentation.kind)
        return
      }

      setActionError(
        presentation.kind === 'network'
          ? presentation.description
          : 'Las fechas se solapan con otra temporada existente.',
      )
    } finally {
      setPendingActionSeasonId(undefined)
    }
  }

  async function deleteSeason(seasonId: string) {
    setActionError('')
    setPendingActionSeasonId(seasonId)

    try {
      await onDeleteSeason(seasonId)
      setPendingDeleteSeasonId(undefined)
    } catch (error) {
      handleActionError(
        error,
        'No se ha podido eliminar la temporada. Inténtalo de nuevo.',
      )
    } finally {
      setPendingActionSeasonId(undefined)
    }
  }

  return (
    <section
      className="ranking-settings-panel"
      aria-labelledby="ranking-settings-title"
    >
      <div className="ranking-settings-panel__heading">
        <span className="ranking-settings-panel__icon" aria-hidden="true">
          <Settings2 size={19} />
        </span>
        <div>
          <span>Competición comunitaria</span>
          <h2 id="ranking-settings-title">Configuración del ranking</h2>
          <p>
            Define el barómetro de la temporada activa y la vista inicial de la
            clasificación.
          </p>
        </div>
      </div>

      {seasonsStatus === 'idle' || seasonsStatus === 'loading' ? (
        <DataStateView
          status="loading"
          loadingTitle="Cargando temporadas…"
          loadingDescription="Estamos consultando las temporadas de la comunidad."
        />
      ) : requiresReauthentication ? (
        <ManagerOtpLogin
          kind={requiresReauthentication}
          onAuthenticated={() => {
            setRequiresReauthentication(undefined)
            onReloadSeasons()
          }}
        />
      ) : seasonsStatus === 'error' ? (
        <DataStateView
          status="error"
          loadingTitle="Cargando temporadas…"
          error={seasonsError}
          onRetry={onReloadSeasons}
        />
      ) : (
        <>
          <section
            className="ranking-season-management"
            aria-labelledby="ranking-season-management-title"
          >
            <div className="ranking-season-management__heading">
              <span aria-hidden="true">
                <Trophy size={18} />
              </span>
              <div>
                <span>Temporadas</span>
                <h3 id="ranking-season-management-title">
                  Crear, programar y cerrar temporadas
                </h3>
              </div>
              {!isCreateFormOpen ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setCreateError('')
                    setIsCreateFormOpen(true)
                  }}
                >
                  Programar temporada
                </button>
              ) : null}
            </div>

            {isCreateFormOpen ? (
              <form className="ranking-season-form" onSubmit={createSeason}>
                <div className="ranking-season-form__fields">
                  <label className="form-field">
                    <span>Nombre</span>
                    <input
                      required
                      maxLength={80}
                      value={newSeason.name}
                      onChange={(event) =>
                        setNewSeason((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Fecha de inicio</span>
                    <input
                      required
                      type="date"
                      value={newSeason.startsOn}
                      onChange={(event) =>
                        setNewSeason((current) => ({
                          ...current,
                          startsOn: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-field">
                    <span>Fecha de fin</span>
                    <input
                      required
                      type="date"
                      value={newSeason.endsOn}
                      onChange={(event) =>
                        setNewSeason((current) => ({
                          ...current,
                          endsOn: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>

                <fieldset>
                  <legend>Puntos de esta temporada</legend>
                  <RankingPointsFields
                    idPrefix="Nueva temporada"
                    points={newSeason.points}
                    onChange={(seasonPoints) =>
                      setNewSeason((current) => ({
                        ...current,
                        points: seasonPoints,
                      }))
                    }
                  />
                </fieldset>

                {createError ? (
                  <p className="registration-error" role="alert">
                    {createError}
                  </p>
                ) : null}

                <div className="ranking-season-form__actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setIsCreateFormOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="primary-button"
                    disabled={pendingActionSeasonId === '__new__'}
                    type="submit"
                  >
                    {pendingActionSeasonId === '__new__'
                      ? 'Programando…'
                      : 'Programar temporada'}
                  </button>
                </div>
              </form>
            ) : null}

            {actionError ? (
              <p className="registration-error" role="alert">
                {actionError}
              </p>
            ) : null}

            <div className="ranking-season-list">
              {seasons.map((season) => {
                const isPending = pendingActionSeasonId === season.id

                return (
                  <div className="ranking-season-row" key={season.id}>
                    <div className="ranking-season-row__identity">
                      <strong>{season.name}</strong>
                      {editingDates?.seasonId === season.id ? (
                        <form
                          className="ranking-season-dates"
                          onSubmit={(event) => {
                            event.preventDefault()
                            void saveDates()
                          }}
                        >
                          <label className="form-field">
                            <span>Inicio</span>
                            <input
                              aria-label={`${season.name}: fecha de inicio`}
                              type="date"
                              required
                              value={editingDates.startsOn}
                              onChange={(event) =>
                                setEditingDates({
                                  ...editingDates,
                                  startsOn: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="form-field">
                            <span>Fin</span>
                            <input
                              aria-label={`${season.name}: fecha de fin`}
                              type="date"
                              required
                              value={editingDates.endsOn}
                              onChange={(event) =>
                                setEditingDates({
                                  ...editingDates,
                                  endsOn: event.target.value,
                                })
                              }
                            />
                          </label>
                          {season.status === 'active' ? (
                            <p className="ranking-season-dates__note">
                              Los resultados se recalcularán con las nuevas
                              fechas.
                            </p>
                          ) : null}
                          <div className="ranking-season-confirmation">
                            <button type="submit" disabled={isPending}>
                              {isPending ? 'Guardando…' : 'Guardar fechas'}
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => {
                                setActionError('')
                                setEditingDates(undefined)
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      ) : (
                        <span>
                          Del {season.startsOn} al {season.endsOn}
                        </span>
                      )}
                    </div>
                    <span
                      className="ranking-season-status"
                      data-status={season.status}
                    >
                      {seasonStatusLabels[season.status]}
                    </span>
                    <div className="ranking-season-row__actions">
                      {season.status === 'upcoming' ? (
                        pendingDeleteSeasonId === season.id ? (
                          <div className="ranking-season-confirmation">
                            <span>¿Eliminar esta temporada programada?</span>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => void deleteSeason(season.id)}
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                setPendingDeleteSeasonId(undefined)
                              }
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              className="secondary-button"
                              type="button"
                              disabled={Boolean(activeSeason) || isPending}
                              title={
                                activeSeason
                                  ? 'Cierra la temporada activa antes de activar esta.'
                                  : undefined
                              }
                              onClick={() => void activateSeason(season.id)}
                            >
                              {isPending ? 'Activando…' : 'Activar'}
                            </button>
                            <button
                              className="secondary-button"
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                setPendingDeleteSeasonId(season.id)
                              }
                            >
                              Eliminar
                            </button>
                            <button
                              className="secondary-button"
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                setEditingDates({
                                  seasonId: season.id,
                                  startsOn: season.startsOn,
                                  endsOn: season.endsOn,
                                })
                              }
                            >
                              Editar fechas
                            </button>
                          </>
                        )
                      ) : season.status === 'active' ? (
                        pendingCloseSeasonId === season.id ? (
                          <div className="ranking-season-confirmation">
                            <span>
                              {upcomingSeasons.length === 1
                                ? `¿Cerrar esta temporada y activar «${upcomingSeasons[0]!.name}»?`
                                : '¿Cerrar esta temporada? Se congelarán sus participantes.'}
                            </span>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => void closeSeason(season.id)}
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => setPendingCloseSeasonId(undefined)}
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              className="secondary-button"
                              type="button"
                              disabled={isPending}
                              onClick={() => setPendingCloseSeasonId(season.id)}
                            >
                              {isPending
                                ? 'Cerrando…'
                                : upcomingSeasons.length === 1
                                  ? `Cerrar y activar «${upcomingSeasons[0]!.name}»`
                                  : 'Cerrar temporada'}
                            </button>
                            <button
                              className="secondary-button"
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                setEditingDates({
                                  seasonId: season.id,
                                  startsOn: season.startsOn,
                                  endsOn: season.endsOn,
                                })
                              }
                            >
                              Editar fechas
                            </button>
                          </>
                        )
                      ) : season.status === 'closed' ? (
                        <span className="ranking-season-row__frozen-note">
                          {season.eligibleMemberIds.length} participantes
                          congelados
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <form onSubmit={(event) => void saveSettings(event)}>
            {activeSeason ? (
              <div className="ranking-settings-season">
                <span>Temporada activa</span>
                <strong>{activeSeason.name}</strong>
                <small>
                  Del {activeSeason.startsOn} al {activeSeason.endsOn}
                </small>
              </div>
            ) : (
              <p className="ranking-settings-season ranking-settings-season--empty">
                No hay ninguna temporada activa. El barómetro no se aplicará a
                una temporada hasta que se active una.
              </p>
            )}

            <fieldset>
              <legend>Puntos comunitarios por posición</legend>
              <RankingPointsFields
                idPrefix="Temporada activa"
                points={points}
                onChange={(nextPoints) => {
                  setSaveStatus('idle')
                  setPoints(nextPoints)
                }}
              />
            </fieldset>

            <div className="ranking-settings-defaults">
              <label className="form-field">
                <span>Jugadores mostrados</span>
                <select
                  value={defaultLimit}
                  onChange={(event) => {
                    setSaveStatus('idle')
                    setDefaultLimit(
                      event.target.value === 'all' ? 'all' : (10 as const),
                    )
                  }}
                >
                  <option value="10">Top 10</option>
                  <option value="all">Todos</option>
                </select>
              </label>
            </div>

            <div className="ranking-settings-actions">
              <span aria-live="polite">
                {saveStatus === 'saved'
                  ? 'Configuración guardada.'
                  : saveStatus === 'invalid'
                    ? 'Los puntos deben disminuir según la posición.'
                    : saveStatus === 'error'
                      ? 'No se ha podido guardar. Inténtalo de nuevo.'
                      : ''}
              </span>
              <button
                className="primary-button"
                disabled={saveStatus === 'saving'}
                type="submit"
              >
                <Save aria-hidden="true" size={16} />
                {saveStatus === 'saving'
                  ? 'Guardando…'
                  : 'Guardar configuración'}
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  )
}
