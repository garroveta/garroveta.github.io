import { Save, Settings2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import type { DemoDataUpdater } from '../data/demoRepository'
import {
  isCommunityRankingSettingsValid,
  updateCommunityRankingSettings,
} from '../data/rankingSettings'
import type { DemoDataSet } from '../domain/types'

type RankingSettingsPanelProps = {
  data: DemoDataSet
  managerId: string
  onDataChange: (updater: DemoDataUpdater) => void
}

export function RankingSettingsPanel({
  data,
  managerId,
  onDataChange,
}: RankingSettingsPanelProps) {
  const activeSeason = data.rankingSeasons.find(
    ({ status }) => status === 'active',
  )
  const [settings, setSettings] = useState({
    ...data.rankingSettings,
    points: activeSeason?.points ?? data.rankingSettings.points,
  })
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'invalid'>(
    'idle',
  )
  const pointFields = [
    ['first', '1.º'],
    ['second', '2.º'],
    ['third', '3.º'],
    ['fourth', '4.º'],
    ['fifth', '5.º'],
    ['sixthToTenth', '6.º–10.º'],
    ['participation', 'Participación'],
  ] as const

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
          <div className="ranking-settings-points">
            {pointFields.map(([field, label]) => (
              <label className="form-field" key={field}>
                <span>{label}</span>
                <input
                  aria-label={`Puntos para ${label}`}
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={settings.points[field]}
                  onChange={(event) => {
                    setSaveStatus('idle')
                    setSettings((current) => ({
                      ...current,
                      points: {
                        ...current.points,
                        [field]: Number(event.target.value),
                      },
                    }))
                  }}
                />
              </label>
            ))}
          </div>
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
