import { Save, Settings2, Trophy } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import type { DemoDataUpdater } from '../data/demoRepository'
import {
  isCommunityRankingSettingsValid,
  updateCommunityRankingSettings,
} from '../data/rankingSettings'
import {
  activateRankingSeason,
  areRankingSeasonsValid,
  closeActiveRankingSeason,
  createRankingSeason,
  deleteUpcomingRankingSeason,
  isRankingSeasonValid,
  type RankingSeasonInput,
} from '../data/rankingSeasons'
import type { CommunityRankingPoints, DemoDataSet } from '../domain/types'

type RankingSettingsPanelProps = {
  data: DemoDataSet
  managerId: string
  onDataChange: (updater: DemoDataUpdater) => void
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
          <input
            aria-label={`${idPrefix}: puntos para ${label}`}
            type="number"
            min="0"
            max="100"
            required
            value={points[field]}
            onChange={(event) =>
              onChange({ ...points, [field]: Number(event.target.value) })
            }
          />
        </label>
      ))}
    </div>
  )
}

export function RankingSettingsPanel({
  data,
  managerId,
  onDataChange,
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
  const [settings, setSettings] = useState({
    ...data.rankingSettings,
    points: activeSeason?.points ?? data.rankingSettings.points,
  })
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'invalid'>(
    'idle',
  )
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [newSeason, setNewSeason] = useState<RankingSeasonInput>({
    name: '',
    startsOn: '',
    endsOn: '',
    points: activeSeason?.points ?? data.rankingSettings.points,
  })
  const [createError, setCreateError] = useState('')
  const [pendingCloseSeasonId, setPendingCloseSeasonId] = useState<string>()
  const [pendingDeleteSeasonId, setPendingDeleteSeasonId] = useState<string>()

  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isCommunityRankingSettingsValid(settings)) {
      setSaveStatus('invalid')
      return
    }

    onDataChange((currentData) =>
      updateCommunityRankingSettings(currentData, managerId, settings),
    )
    setSaveStatus('saved')
  }

  function createSeason(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreateError('')

    const candidate = {
      id: '__draft__',
      communityId: data.community.id,
      name: newSeason.name,
      startsOn: newSeason.startsOn,
      endsOn: newSeason.endsOn,
      points: newSeason.points,
      status: 'upcoming' as const,
    }

    if (!isRankingSeasonValid(candidate)) {
      setCreateError(
        'Revisa el nombre, las fechas y los puntos de la temporada.',
      )
      return
    }

    if (!areRankingSeasonsValid([...data.rankingSeasons, candidate])) {
      setCreateError('Las fechas se solapan con otra temporada existente.')
      return
    }

    onDataChange((currentData) =>
      createRankingSeason(currentData, managerId, newSeason),
    )
    setNewSeason({
      name: '',
      startsOn: '',
      endsOn: '',
      points: activeSeason?.points ?? data.rankingSettings.points,
    })
    setIsCreateFormOpen(false)
  }

  function closeSeason(seasonId: string) {
    const nextSeasonId =
      upcomingSeasons.length === 1 ? upcomingSeasons[0]!.id : undefined

    onDataChange((currentData) => {
      const closedData = closeActiveRankingSeason(
        currentData,
        managerId,
        seasonId,
      )

      return nextSeasonId
        ? activateRankingSeason(closedData, managerId, nextSeasonId)
        : closedData
    })
    setPendingCloseSeasonId(undefined)
  }

  function deleteSeason(seasonId: string) {
    onDataChange((currentData) =>
      deleteUpcomingRankingSeason(currentData, managerId, seasonId),
    )
    setPendingDeleteSeasonId(undefined)
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
                onChange={(points) =>
                  setNewSeason((current) => ({ ...current, points }))
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
              <button className="primary-button" type="submit">
                Programar temporada
              </button>
            </div>
          </form>
        ) : null}

        <div className="ranking-season-list">
          {seasons.map((season) => (
            <div className="ranking-season-row" key={season.id}>
              <div className="ranking-season-row__identity">
                <strong>{season.name}</strong>
                <span>
                  Del {season.startsOn} al {season.endsOn}
                </span>
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
                        onClick={() => deleteSeason(season.id)}
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteSeasonId(undefined)}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={Boolean(activeSeason)}
                        title={
                          activeSeason
                            ? 'Cierra la temporada activa antes de activar esta.'
                            : undefined
                        }
                        onClick={() =>
                          onDataChange((currentData) =>
                            activateRankingSeason(
                              currentData,
                              managerId,
                              season.id,
                            ),
                          )
                        }
                      >
                        Activar
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => setPendingDeleteSeasonId(season.id)}
                      >
                        Eliminar
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
                        onClick={() => closeSeason(season.id)}
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingCloseSeasonId(undefined)}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => setPendingCloseSeasonId(season.id)}
                    >
                      {upcomingSeasons.length === 1
                        ? `Cerrar y activar «${upcomingSeasons[0]!.name}»`
                        : 'Cerrar temporada'}
                    </button>
                  )
                ) : season.status === 'closed' ? (
                  <span className="ranking-season-row__frozen-note">
                    {season.eligibleMemberIds.length} participantes congelados
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <form onSubmit={saveSettings}>
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
            No hay ninguna temporada activa. El barómetro no se aplicará a una
            temporada hasta que se active una.
          </p>
        )}

        <fieldset>
          <legend>Puntos comunitarios por posición</legend>
          <RankingPointsFields
            idPrefix="Temporada activa"
            points={settings.points}
            onChange={(points) => {
              setSaveStatus('idle')
              setSettings((current) => ({ ...current, points }))
            }}
          />
        </fieldset>

        <div className="ranking-settings-defaults">
          <label className="form-field">
            <span>Jugadores mostrados</span>
            <select
              value={settings.defaultLimit}
              onChange={(event) => {
                setSaveStatus('idle')
                setSettings((current) => ({
                  ...current,
                  defaultLimit:
                    event.target.value === 'all' ? 'all' : (10 as const),
                }))
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
                : ''}
          </span>
          <button className="primary-button" type="submit">
            <Save aria-hidden="true" size={16} />
            Guardar configuración
          </button>
        </div>
      </form>
    </section>
  )
}
